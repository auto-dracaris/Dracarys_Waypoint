import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter_application/services/auth_service.dart';

void main() {
  test(
    'registration and verification use normalized phone and OTP id',
    () async {
      final paths = <String>[];
      final auth = AuthService(
        client: MockClient((request) async {
          paths.add(request.url.path);
          final body = jsonDecode(request.body);
          expect(body['phone'], '+94771234567');
          if (request.url.path.endsWith('/register')) {
            expect(body['firstName'], 'Test');
            expect(body['lastName'], 'Loader');
            expect(body['password'], 'Secret!1');
            return http.Response('{"data":{"otpId":42}}', 201);
          }
          expect(body['otpId'], 42);
          expect(body['otp'], '123456');
          return http.Response('{"data":null}', 200);
        }),
      );
      final id = await auth.register(
        firstName: 'Test',
        lastName: 'Loader',
        phone: '0771234567',
        password: 'Secret!1',
      );
      await auth.verifyPhone(phone: '0771234567', otpId: id, otp: '123456');
      expect(paths, ['/api/auth/register', '/api/auth/verify-otp']);
      auth.dispose();
    },
  );

  test(
    'resend replaces OTP id and invalid code preserves backend error',
    () async {
      final auth = AuthService(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/resend-otp')) {
            return http.Response('{"data":{"otpId":99}}', 200);
          }
          return http.Response('{"message":"Invalid or expired OTP"}', 400);
        }),
      );
      expect(await auth.resendOtp('0771234567'), 99);
      await expectLater(
        auth.verifyPhone(phone: '0771234567', otpId: 99, otp: '000000'),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            'Invalid or expired OTP',
          ),
        ),
      );
      auth.dispose();
    },
  );
}
