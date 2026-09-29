import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_providers.dart';
import '../domain/driver.dart';

/// State is the signed-in driver, or null when signed out. `login`/`signUp`
/// throw AuthException on failure and leave state untouched so the form can
/// show the message itself.
class AuthController extends AsyncNotifier<Driver?> {
  @override
  Future<Driver?> build() => ref.read(authRepositoryProvider).currentDriver();

  Future<void> login({required String email, required String password}) async {
    final driver = await ref
        .read(authRepositoryProvider)
        .login(email: email, password: password);
    state = AsyncData(driver);
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    final driver = await ref
        .read(authRepositoryProvider)
        .signUp(name: name, email: email, password: password);
    state = AsyncData(driver);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, Driver?>(AuthController.new);
