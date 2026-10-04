import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/http_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
        jsonEncode({'statusCode': status, 'message': message, 'data': data}),
        status,
        headers: {'content-type': 'application/json'});

Map<String, dynamic> userJson(
        {String role = 'driver', bool withDriver = true}) =>
    {
      'id': 12,
      'firstName': 'Kasun',
      'lastName': 'Perera',
      'phone': '94771234567',
      'role': role,
      'status': 'active',
      if (withDriver)
        'driver': <String, dynamic>{
          'code': 'DRV-0012',
          'depot': 'Peliyagoda',
          'depotLocation': {'lat': 6.9645, 'lng': 79.888},
          'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
        },
    };

({HttpAuthRepository repo, InMemoryTokenStore tokens, List<http.Request> sent})
    build(http.Response Function(http.Request) respond) {
  final tokens = InMemoryTokenStore();
  final sent = <http.Request>[];
  final api = ApiClient(
    baseUrl: 'http://api.test/api',
    tokens: tokens,
    client: MockClient((req) async {
      sent.add(req);
      return respond(req);
    }),
  );
  return (repo: HttpAuthRepository(api, tokens), tokens: tokens, sent: sent);
}

void main() {
  test('driverFromJson maps the profile and vehicle', () {
    final d = driverFromJson(userJson());
    expect(d.id, '12');
    expect(d.name, 'Kasun Perera');
    expect(d.initials, 'KP');
    expect(d.code, 'DRV-0012');
    expect(d.depot, 'Peliyagoda');
    expect(d.vehicle!.id, 21);
    expect(d.vehicle!.plate, 'VEH021');
    expect(d.vehicle!.type, 'Refrigerated van');
  });

  test('driverFromJson tolerates a driver with no vehicle', () {
    final json = userJson();
    (json['driver'] as Map)['vehicle'] = null;
    expect(driverFromJson(json).vehicle, isNull);
  });

  test('driverFromJson rejects non-drivers', () {
    expect(() => driverFromJson(userJson(role: 'loader', withDriver: false)),
        throwsA(isA<AuthException>()));
  });

  test('login stores tokens and returns the driver', () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/login');
      expect(
          jsonDecode(req.body), {'phone': '0770000002', 'password': '111111'});
      return envelope(200, 'Logged in successfully',
          {'accessToken': 'A', 'refreshToken': 'R', 'user': userJson()});
    });
    final d = await t.repo.login(phone: '0770000002', password: '111111');
    expect(d.name, 'Kasun Perera');
    expect(await t.tokens.readAccess(), 'A');
    expect(await t.tokens.readRefresh(), 'R');
  });

  test('login by a non-driver keeps no tokens', () async {
    final t = build((_) => envelope(200, 'ok', {
          'accessToken': 'A',
          'refreshToken': 'R',
          'user': userJson(role: 'loader', withDriver: false)
        }));
    await expectLater(t.repo.login(phone: '0770000003', password: '111111'),
        throwsA(isA<AuthException>()));
    expect(await t.tokens.readAccess(), isNull);
  });

  test('login surfaces the API message (wrong password, pending account)',
      () async {
    final t = build((_) =>
        envelope(401, 'Please verify your phone number with the OTP first'));
    await expectLater(
        t.repo.login(phone: '0771111111', password: 'Secret1!'),
        throwsA(isA<AuthException>().having(
            (e) => e.message, 'message', contains('verify your phone'))));
  });

  test('an unreachable server is an AuthException and keeps the session',
      () async {
    final t = build((_) => throw http.ClientException('down'));
    await t.tokens.save(access: 'A', refresh: 'R');
    await expectLater(t.repo.login(phone: '0770000002', password: '111111'),
        throwsA(isA<AuthException>()));
    expect(await t.tokens.readAccess(), 'A');
  });

  test('currentDriver is null without a token and makes no request', () async {
    final t = build((_) => envelope(200, 'ok', userJson()));
    expect(await t.repo.currentDriver(), isNull);
    expect(t.sent, isEmpty);
  });

  test('currentDriver loads /auth/me when signed in', () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/me');
      return envelope(200, 'ok', userJson());
    });
    await t.tokens.save(access: 'A', refresh: 'R');
    expect((await t.repo.currentDriver())!.code, 'DRV-0012');
  });

  test('currentDriver is null when the session is dead (401, refresh fails)',
      () async {
    final t = build((_) => envelope(401, 'Unauthorized'));
    await t.tokens.save(access: 'A', refresh: 'R');
    expect(await t.repo.currentDriver(), isNull);
  });

  test('signUp posts the exact fields and returns the OTP challenge',
      () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/register');
      expect(jsonDecode(req.body), {
        'firstName': 'Kasun',
        'lastName': 'Perera',
        'phone': '0771111111',
        'password': 'Secret1!',
      });
      return envelope(201, 'registered', {'userId': 30, 'otpId': 7});
    });
    final c = await t.repo.signUp(
        firstName: 'Kasun',
        lastName: 'Perera',
        phone: '0771111111',
        password: 'Secret1!');
    expect(c.otpId, 7);
    expect(c.phone, '0771111111');
  });

  test(
      'verifyOtp, resendOtp, forgotPassword and resetPassword hit the right paths',
      () async {
    final seen = <String, Object?>{};
    final t = build((req) {
      seen[req.url.path] = jsonDecode(req.body);
      return envelope(
          200, 'ok', req.url.path.endsWith('/resend-otp') ? {'otpId': 8} : null);
    });
    await t.repo.verifyOtp(phone: '0771111111', otp: '123456', otpId: 7);
    await t.repo.resendOtp(phone: '0771111111');
    await t.repo.forgotPassword(phone: '0771111111');
    await t.repo.resetPassword(
        phone: '0771111111', otp: '654321', newPassword: 'Newpass1!');
    expect(seen, {
      '/api/auth/verify-otp': {
        'phone': '0771111111',
        'otp': '123456',
        'otpId': 7
      },
      '/api/auth/resend-otp': {'phone': '0771111111'},
      '/api/auth/forgot-password': {'phone': '0771111111'},
      '/api/auth/reset-password': {
        'phone': '0771111111',
        'otp': '654321',
        'newPassword': 'Newpass1!'
      },
    });
  });

  test('resendOtp returns the new otpId the API issued', () async {
    final t = build((_) => envelope(200, 'OTP resent successfully', {'otpId': 8}));
    expect(await t.repo.resendOtp(phone: '0771111111'), 8);
  });

  test('logout calls the API and clears tokens even if the call fails',
      () async {
    final t = build((_) => throw http.ClientException('down'));
    await t.tokens.save(access: 'A', refresh: 'R');
    await t.repo.logout();
    expect(await t.tokens.readAccess(), isNull);
    expect(await t.tokens.readRefresh(), isNull);
  });
}
