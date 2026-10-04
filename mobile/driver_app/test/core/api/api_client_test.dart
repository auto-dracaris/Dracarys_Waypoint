import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
        jsonEncode({'statusCode': status, 'message': message, 'data': data}),
        status,
        headers: {'content-type': 'application/json'});

ApiClient clientWith(
  MockClient mock, {
  TokenStore? tokens,
  void Function()? onSignedOut,
}) =>
    ApiClient(
      baseUrl: 'http://api.test/api',
      tokens: tokens ?? InMemoryTokenStore(access: 'A1', refresh: 'R1'),
      client: mock,
      onSignedOut: onSignedOut,
    );

void main() {
  test('returns the envelope data and sends the bearer token', () async {
    late http.Request seen;
    final api = clientWith(MockClient((req) async {
      seen = req;
      return envelope(200, 'ok', {'x': 1});
    }));
    final data = await api.get('/trips', query: {'page': '1'});
    expect(data, {'x': 1});
    expect(seen.url.toString(), 'http://api.test/api/trips?page=1');
    expect(seen.headers['Authorization'], 'Bearer A1');
  });

  test('post sends a JSON body', () async {
    late http.Request seen;
    final api = clientWith(MockClient((req) async {
      seen = req;
      return envelope(201, 'created', null);
    }));
    await api.post('/issues', body: {'type': 'other'});
    expect(jsonDecode(seen.body), {'type': 'other'});
    expect(seen.headers['Content-Type'], contains('application/json'));
  });

  test('a non-2xx throws ApiException with message and data', () async {
    final api = clientWith(MockClient(
        (_) async => envelope(409, 'Trip is not ready', {'id': 'trip-1'})));
    await expectLater(
      api.post('/trips/x/start', body: {}),
      throwsA(isA<ApiException>()
          .having((e) => e.statusCode, 'statusCode', 409)
          .having((e) => e.message, 'message', 'Trip is not ready')
          .having((e) => e.data, 'data', {'id': 'trip-1'})),
    );
  });

  test('a non-JSON error body still throws a usable ApiException', () async {
    final api =
        clientWith(MockClient((_) async => http.Response('<html>', 502)));
    await expectLater(
      api.get('/routing/route'),
      throwsA(isA<ApiException>()
          .having((e) => e.statusCode, 'statusCode', 502)
          .having((e) => e.message, 'message', isNotEmpty)),
    );
  });

  test('on 401 it refreshes once, saves rotated tokens and retries', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    final calls = <String>[];
    final api = clientWith(
      MockClient((req) async {
        calls.add(
            '${req.method} ${req.url.path} ${req.headers['Authorization']}');
        if (req.url.path.endsWith('/auth/refresh')) {
          expect(jsonDecode(req.body), {'refreshToken': 'R1'});
          return envelope(200, 'ok',
              {'accessToken': 'new', 'refreshToken': 'R2', 'user': {}});
        }
        return req.headers['Authorization'] == 'Bearer new'
            ? envelope(200, 'ok', {'ok': true})
            : envelope(401, 'Unauthorized');
      }),
      tokens: tokens,
    );
    expect(await api.get('/trips'), {'ok': true});
    expect(await tokens.readAccess(), 'new');
    expect(await tokens.readRefresh(), 'R2');
    expect(calls, [
      'GET /api/trips Bearer old',
      'POST /api/auth/refresh null',
      'GET /api/trips Bearer new',
    ]);
  });

  test('when refresh is rejected it signs out and throws 401', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var signedOut = 0;
    final api = clientWith(
      MockClient((req) async => req.url.path.endsWith('/auth/refresh')
          ? envelope(401, 'Invalid refresh token')
          : envelope(401, 'Unauthorized')),
      tokens: tokens,
      onSignedOut: () => signedOut++,
    );
    await expectLater(
        api.get('/trips'),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
    expect(await tokens.readAccess(), isNull);
    expect(await tokens.readRefresh(), isNull);
    expect(signedOut, 1);
  });

  test('a 5xx on refresh keeps the session and surfaces the error', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var signedOut = 0;
    final api = clientWith(
      MockClient((req) async => req.url.path.endsWith('/auth/refresh')
          ? envelope(503, 'Service unavailable')
          : envelope(401, 'Unauthorized')),
      tokens: tokens,
      onSignedOut: () => signedOut++,
    );
    await expectLater(api.get('/trips'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 503)));
    expect(await tokens.readAccess(), 'old');
    expect(await tokens.readRefresh(), 'R1');
    expect(signedOut, 0);
  });

  test('a network drop during refresh keeps the session', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var signedOut = 0;
    final api = clientWith(
      MockClient((req) async {
        if (req.url.path.endsWith('/auth/refresh')) {
          throw http.ClientException('dropped');
        }
        return envelope(401, 'Unauthorized');
      }),
      tokens: tokens,
      onSignedOut: () => signedOut++,
    );
    await expectLater(api.get('/trips'),
        throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', true)));
    expect(await tokens.readRefresh(), 'R1');
    expect(signedOut, 0);
  });

  test('a 401 with no stored session does not signal sign-out again', () async {
    var signedOut = 0;
    final api = clientWith(
      MockClient((_) async => envelope(401, 'Unauthorized')),
      tokens: InMemoryTokenStore(),
      onSignedOut: () => signedOut++,
    );
    await expectLater(api.get('/trips'), throwsA(isA<ApiException>()));
    expect(signedOut, 0);
  });

  test('concurrent 401s trigger a single refresh', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var refreshes = 0;
    final api = clientWith(
      MockClient((req) async {
        if (req.url.path.endsWith('/auth/refresh')) {
          refreshes++;
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return envelope(200, 'ok',
              {'accessToken': 'new', 'refreshToken': 'R2', 'user': {}});
        }
        return req.headers['Authorization'] == 'Bearer new'
            ? envelope(200, 'ok', 1)
            : envelope(401, 'Unauthorized');
      }),
      tokens: tokens,
    );
    final results =
        await Future.wait([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(results, [1, 1, 1]);
    expect(refreshes, 1);
  });

  test('auth:false 401 is returned as an error without refreshing', () async {
    var refreshes = 0;
    final api = clientWith(MockClient((req) async {
      if (req.url.path.endsWith('/auth/refresh')) refreshes++;
      return envelope(401, 'Invalid phone number or password');
    }));
    await expectLater(
      api.post('/auth/login',
          body: {'phone': 'x', 'password': 'y'}, auth: false),
      throwsA(isA<ApiException>().having(
          (e) => e.message, 'message', 'Invalid phone number or password')),
    );
    expect(refreshes, 0);
  });

  test('network failure throws a network ApiException and keeps the session',
      () async {
    final tokens = InMemoryTokenStore(access: 'A1', refresh: 'R1');
    final api = clientWith(
        MockClient((_) async => throw http.ClientException('no route')),
        tokens: tokens);
    await expectLater(
        api.get('/trips'),
        throwsA(isA<ApiException>()
            .having((e) => e.isNetwork, 'isNetwork', true)));
    expect(await tokens.readAccess(), 'A1');
  });
}
