import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/services/auth_service.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'login sends JSON phone credentials and persists loader session',
    () async {
      final service = AuthService(
        client: MockClient((request) async {
          expect(request.url.path, '/api/auth/login');
          expect(request.headers['Content-Type'], 'application/json');
          expect(jsonDecode(request.body), {
            'phone': '+94771234567',
            'password': 'password123',
          });
          return http.Response(
            jsonEncode({
              'data': {
                'accessToken': 'token',
                'refreshToken': 'refresh',
                'user': {'role': 'loader'},
              },
            }),
            200,
          );
        }),
      );
      await service.login(phone: '0771234567', password: 'password123');
      final prefs = await SharedPreferences.getInstance();
      expect(
        jsonDecode(prefs.getString(AuthService.sessionKey)!)['accessToken'],
        'token',
      );
      service.dispose();
    },
  );
  test('failed credentials do not create a session', () async {
    final service = AuthService(
      client: MockClient((_) async => http.Response('{}', 401)),
    );
    await expectLater(
      service.login(phone: '0771234567', password: 'bad'),
      throwsStateError,
    );
    expect(
      (await SharedPreferences.getInstance()).getString(AuthService.sessionKey),
      isNull,
    );
    service.dispose();
  });
  test('expired tokens cannot auto login', () async {
    final payload = base64Url.encode(utf8.encode(jsonEncode({'exp': 1})));
    SharedPreferences.setMockInitialValues({
      AuthService.sessionKey: jsonEncode({
        'accessToken': 'header.$payload.signature',
        'user': {'role': 'loader'},
      }),
    });
    final service = AuthService();
    expect(await service.hasValidToken(), isFalse);
    service.dispose();
  });
}
