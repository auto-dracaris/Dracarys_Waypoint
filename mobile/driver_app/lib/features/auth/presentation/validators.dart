const _phoneMessage = 'Enter a valid mobile number';

/// Sri Lankan mobile: 07XXXXXXXX, 7XXXXXXXX, 947XXXXXXXX or +947XXXXXXXX, with
/// optional spaces/dashes. The API normalizes the number itself.
String? validatePhone(String? v) {
  final digits = (v ?? '').replaceAll(RegExp(r'[\s\-]'), '');
  return RegExp(r'^(\+?94|0)?7\d{8}$').hasMatch(digits) ? null : _phoneMessage;
}

String? validatePassword(String? v) =>
    (v ?? '').length >= 6 ? null : 'Password must be at least 6 characters';

/// The API's rule for a new password (sign-up and reset).
String? validateNewPassword(String? v) {
  final value = v ?? '';
  final ok = value.length >= 6 &&
      RegExp(r'[A-Z]').hasMatch(value) &&
      RegExp(r'''[!@#$%^&*(),.?":{}|<>]''').hasMatch(value);
  return ok
      ? null
      : 'Use 6+ characters with an uppercase letter and a special character';
}

String? validateOtp(String? v) => RegExp(r'^\d{6}$').hasMatch((v ?? '').trim())
    ? null
    : 'Enter the 6-digit code';

String? validateName(String? v) =>
    (v ?? '').trim().isEmpty ? 'Enter your name' : null;

String? validateConfirm(String? confirm, String password) =>
    confirm == password ? null : 'Passwords do not match';
