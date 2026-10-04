import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

MockAuthRepository repo() => MockAuthRepository(latency: Duration.zero);

void main() {
  test('login returns the demo driver and sets the session', () async {
    final r = repo();
    expect(await r.currentDriver(), isNull);
    final d = await r.login(phone: '0770000002', password: 'secret1');
    expect(d.name, 'Nimal Silva');
    expect(d.initials, 'NS');
    expect((await r.currentDriver())!.code, 'DRV021');
  });

  test('login rejects a short password', () async {
    expect(() => repo().login(phone: '0770000002', password: '123'),
        throwsA(isA<AuthException>()));
  });

  test('signUp needs the OTP before the account can sign in', () async {
    final r = repo();
    final challenge = await r.signUp(
        firstName: 'Kasun',
        lastName: 'Perera',
        phone: '0771111111',
        password: 'Secret1!');
    expect(challenge.phone, '0771111111');
    expect(
        () => r.login(phone: '0771111111', password: 'Secret1!'),
        throwsA(isA<AuthException>()
            .having((e) => e.message, 'message', contains('verify'))));
    await r.verifyOtp(
        phone: '0771111111', otp: '123456', otpId: challenge.otpId);
    final d = await r.login(phone: '0771111111', password: 'Secret1!');
    expect(d.name, 'Kasun Perera');
    expect(d.initials, 'KP');
    await r.logout();
    expect(await r.currentDriver(), isNull);
  });

  test('a wrong OTP is rejected', () async {
    final r = repo();
    final c = await r.signUp(
        firstName: 'A',
        lastName: 'B',
        phone: '0772222222',
        password: 'Secret1!');
    expect(
        () => r.verifyOtp(phone: '0772222222', otp: '000000', otpId: c.otpId),
        throwsA(isA<AuthException>()));
  });

  test('signUp with an existing phone throws AuthException', () async {
    final r = repo();
    await r.signUp(
        firstName: 'A',
        lastName: 'B',
        phone: '0773333333',
        password: 'Secret1!');
    expect(
        () => r.signUp(
            firstName: 'C',
            lastName: 'D',
            phone: '0773333333',
            password: 'Secret1!'),
        throwsA(isA<AuthException>()));
  });
}
