String? validateEmail(String? v) {
  final value = (v ?? '').trim();
  return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)
      ? null
      : 'Enter a valid email';
}

String? validatePassword(String? v) =>
    (v ?? '').length >= 6 ? null : 'Password must be at least 6 characters';

String? validateName(String? v) =>
    (v ?? '').trim().isEmpty ? 'Enter your name' : null;

String? validateConfirm(String? confirm, String password) =>
    confirm == password ? null : 'Passwords do not match';
