import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

MockAuthRepository repo() => MockAuthRepository(latency: Duration.zero);

void main() {
  test('login returns the demo driver and sets the session', () async {
    final r = repo();
    expect(await r.currentDriver(), isNull);
    final d = await r.login(email: 'x@y.lk', password: 'secret1');
    expect(d.name, 'Nimal Silva');
    expect(d.initials, 'NS');
    expect((await r.currentDriver())!.code, 'DRV021');
  });

  test('login rejects a short password', () async {
    expect(() => repo().login(email: 'x@y.lk', password: '123'),
        throwsA(isA<AuthException>()));
  });

  test('signUp then login returns the new driver; logout clears session',
      () async {
    final r = repo();
    final created = await r.signUp(
        name: 'Kasun Perera', email: 'K@y.lk', password: 'secret1');
    expect(created.name, 'Kasun Perera');
    expect(created.initials, 'KP');
    final again = await r.login(email: 'k@y.lk', password: 'secret1');
    expect(again.id, created.id);
    await r.logout();
    expect(await r.currentDriver(), isNull);
  });

  test('signUp with an existing email throws AuthException', () async {
    final r = repo();
    await r.signUp(name: 'A B', email: 'a@b.lk', password: 'secret1');
    expect(() => r.signUp(name: 'C D', email: 'A@B.lk', password: 'secret1'),
        throwsA(isA<AuthException>()));
  });
}
