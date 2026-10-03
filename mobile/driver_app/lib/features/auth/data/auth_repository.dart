import '../domain/driver.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Where a sign-up stands: the code was sent and must be confirmed.
class OtpChallenge {
  const OtpChallenge({required this.phone, required this.otpId});

  final String phone;
  final int otpId;
}

abstract interface class AuthRepository {
  Future<Driver?> currentDriver();
  Future<Driver> login({required String phone, required String password});
  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  });
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  });
  Future<void> resendOtp({required String phone});
  Future<void> forgotPassword({required String phone});
  Future<void> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  });
  Future<void> logout();
}
