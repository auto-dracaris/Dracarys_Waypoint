import '../domain/driver.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

abstract interface class AuthRepository {
  Future<Driver?> currentDriver();
  Future<Driver> login({required String email, required String password});
  Future<Driver> signUp({
    required String name,
    required String email,
    required String password,
  });
  Future<void> logout();
}
