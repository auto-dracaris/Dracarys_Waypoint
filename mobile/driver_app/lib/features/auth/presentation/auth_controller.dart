import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_providers.dart';
import '../data/auth_repository.dart';
import '../domain/driver.dart';

/// State is the signed-in driver, or null when signed out. Methods throw
/// AuthException on failure and leave state untouched so the form can show the
/// message itself. Only [login] changes who is signed in.
class AuthController extends AsyncNotifier<Driver?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<Driver?> build() => _repo.currentDriver();

  Future<void> login({required String phone, required String password}) async {
    state = AsyncData(await _repo.login(phone: phone, password: password));
  }

  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) =>
      _repo.signUp(
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          password: password);

  Future<void> verifyOtp(
          {required String phone, required String otp, required int otpId}) =>
      _repo.verifyOtp(phone: phone, otp: otp, otpId: otpId);

  Future<int> resendOtp({required String phone}) =>
      _repo.resendOtp(phone: phone);

  Future<void> forgotPassword({required String phone}) =>
      _repo.forgotPassword(phone: phone);

  Future<void> resetPassword(
          {required String phone,
          required String otp,
          required String newPassword}) =>
      _repo.resetPassword(phone: phone, otp: otp, newPassword: newPassword);

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, Driver?>(AuthController.new);
