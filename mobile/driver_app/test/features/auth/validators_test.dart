import 'package:driver_app/features/auth/presentation/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validatePhone accepts Sri Lankan mobiles in common spellings', () {
    for (final ok in [
      '0770000002',
      '077 000 0002',
      '077-000-0002',
      '94770000002',
      '+94 77 000 0002',
      '770000002',
    ]) {
      expect(validatePhone(ok), isNull, reason: ok);
    }
  });

  test('validatePhone rejects everything else', () {
    for (final bad in [
      null,
      '',
      '   ',
      '12345',
      '0112345678',
      'abcdefghij',
      '07700000'
    ]) {
      expect(validatePhone(bad), 'Enter a valid mobile number', reason: '$bad');
    }
  });

  test('validatePassword (login) needs 6 characters', () {
    expect(validatePassword(null), 'Password must be at least 6 characters');
    expect(validatePassword('12345'), 'Password must be at least 6 characters');
    expect(validatePassword('111111'), isNull);
  });

  test('validateNewPassword follows the API rule', () {
    const msg =
        'Use 6+ characters with an uppercase letter and a special character';
    expect(validateNewPassword(null), msg);
    expect(validateNewPassword('Ab1!'), msg);
    expect(validateNewPassword('abcdef!'), msg);
    expect(validateNewPassword('Abcdefg'), msg);
    expect(validateNewPassword('Abcde!'), isNull);
  });

  test('validateOtp needs exactly six digits', () {
    expect(validateOtp(null), 'Enter the 6-digit code');
    expect(validateOtp('12345'), 'Enter the 6-digit code');
    expect(validateOtp('12345a'), 'Enter the 6-digit code');
    expect(validateOtp('123456'), isNull);
  });

  test('validateName and validateConfirm', () {
    expect(validateName(null), 'Enter your name');
    expect(validateName('   '), 'Enter your name');
    expect(validateName('Nimal'), isNull);
    expect(validateConfirm('abc', 'abcdef'), 'Passwords do not match');
    expect(validateConfirm('abcdef', 'abcdef'), isNull);
  });
}
