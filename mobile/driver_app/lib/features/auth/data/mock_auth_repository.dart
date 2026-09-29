import '../domain/driver.dart';
import 'auth_repository.dart';

class MockAuthRepository implements AuthRepository {
  MockAuthRepository({this.latency = const Duration(milliseconds: 600)});

  static const demoDriver = Driver(
    id: 'drv-021',
    name: 'Nimal Silva',
    code: 'DRV021',
    depot: 'Peliyagoda depot',
  );

  final Duration latency;
  final Map<String, Driver> _registered = {};
  Driver? _current;

  Future<void> _wait() => Future<void>.delayed(latency);
  String _key(String email) => email.trim().toLowerCase();

  @override
  Future<Driver?> currentDriver() async {
    await _wait();
    return _current;
  }

  @override
  Future<Driver> login({required String email, required String password}) async {
    await _wait();
    if (password.length < 6) {
      throw const AuthException('Invalid email or password');
    }
    return _current = _registered[_key(email)] ?? demoDriver;
  }

  @override
  Future<Driver> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    await _wait();
    final key = _key(email);
    if (_registered.containsKey(key)) {
      throw const AuthException('This email is already registered');
    }
    final n = _registered.length + 1;
    final driver = Driver(
      id: 'drv-${100 + n}',
      name: name.trim(),
      code: 'DRV${100 + n}',
      depot: 'Peliyagoda depot',
    );
    _registered[key] = driver;
    return _current = driver;
  }

  @override
  Future<void> logout() async {
    await _wait();
    _current = null;
  }
}
