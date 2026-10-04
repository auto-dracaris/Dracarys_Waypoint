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

  /// The code every mock OTP flow accepts.
  static const validOtp = '123456';

  final Duration latency;
  final Map<String, Driver> _registered = {};
  final Set<String> _pending = {};
  final Map<String, int> _otpIds = {};
  int _nextOtpId = 1;
  Driver? _current;

  Future<void> _wait() => Future<void>.delayed(latency);
  String _key(String phone) => phone.replaceAll(RegExp(r'[^0-9]'), '');

  @override
  Future<Driver?> currentDriver() async {
    await _wait();
    return _current;
  }

  @override
  Future<Driver> login(
      {required String phone, required String password}) async {
    await _wait();
    if (password.length < 6) {
      throw const AuthException('Invalid phone number or password');
    }
    final key = _key(phone);
    if (_pending.contains(key)) {
      throw const AuthException(
          'Please verify your phone number with the OTP first');
    }
    return _current = _registered[key] ?? demoDriver;
  }

  @override
  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) async {
    await _wait();
    final key = _key(phone);
    if (_registered.containsKey(key)) {
      throw const AuthException('This phone number is already registered');
    }
    final n = _registered.length + 1;
    _registered[key] = Driver(
      id: 'drv-${100 + n}',
      name: '${firstName.trim()} ${lastName.trim()}',
      code: 'DRV${100 + n}',
      depot: 'Peliyagoda depot',
    );
    _pending.add(key);
    return OtpChallenge(phone: phone, otpId: _otpIds[key] = _nextOtpId++);
  }

  @override
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  }) async {
    await _wait();
    final key = _key(phone);
    if (otp != validOtp || _otpIds[key] != otpId) {
      throw const AuthException('Invalid or expired code');
    }
    _pending.remove(key);
  }

  @override
  Future<int> resendOtp({required String phone}) async {
    await _wait();
    return _otpIds[_key(phone)] = _nextOtpId++;
  }

  @override
  Future<void> forgotPassword({required String phone}) => _wait();

  @override
  Future<void> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  }) async {
    await _wait();
    if (otp != validOtp) {
      throw const AuthException('Invalid or expired code');
    }
  }

  @override
  Future<void> logout() async {
    await _wait();
    _current = null;
  }
}
