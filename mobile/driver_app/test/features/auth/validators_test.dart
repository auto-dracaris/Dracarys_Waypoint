import 'package:driver_app/features/auth/presentation/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validateEmail', () {
    expect(validateEmail(null), 'Enter a valid email');
    expect(validateEmail(''), 'Enter a valid email');
    expect(validateEmail('   '), 'Enter a valid email');
    expect(validateEmail('bad'), 'Enter a valid email');
    expect(validateEmail('a@b'), 'Enter a valid email');
    expect(validateEmail(' nimal@waypoint.lk '), isNull);
  });

  test('validatePassword', () {
    expect(validatePassword(null), 'Password must be at least 6 characters');
    expect(validatePassword('12345'), 'Password must be at least 6 characters');
    expect(validatePassword('123456'), isNull);
  });

  test('validateName', () {
    expect(validateName(null), 'Enter your name');
    expect(validateName('   '), 'Enter your name');
    expect(validateName('Nimal'), isNull);
  });

  test('validateConfirm', () {
    expect(validateConfirm('abc', 'abcdef'), 'Passwords do not match');
    expect(validateConfirm('abcdef', 'abcdef'), isNull);
  });
}
