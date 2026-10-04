import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/token_store.dart';
import '../../../core/storage/offline_cache.dart';
import '../domain/driver.dart';
import 'auth_repository.dart';

double? _coordinate(Object? location, String key) =>
    location is Map<String, dynamic>
    ? double.tryParse('${location[key]}')
    : null;

/// Maps the API's `user` (login, refresh, `/auth/me`) to a [Driver].
Driver driverFromJson(Map<String, dynamic> user) {
  final driver = user['driver'];
  if (user['role'] != 'driver' || driver is! Map<String, dynamic>) {
    throw const AuthException('This app is for drivers only');
  }
  final vehicle = driver['vehicle'];
  final location = driver['depotLocation'];
  return Driver(
    id: '${user['id']}',
    name: '${user['firstName']} ${user['lastName']}'.trim(),
    firstName: '${user['firstName'] ?? ''}',
    lastName: '${user['lastName'] ?? ''}',
    phone: '${user['phone'] ?? ''}',
    avatarUrl: user['avatar'] as String?,
    depotLat: _coordinate(location, 'lat'),
    depotLng: _coordinate(location, 'lng'),
    code: driver['code'] as String,
    depot: (driver['depot'] as String?) ?? '',
    vehicle: vehicle is Map<String, dynamic>
        ? DriverVehicle(
            id: vehicle['id'] as int,
            plate: vehicle['plate'] as String,
            type: vehicle['type'] as String,
          )
        : null,
  );
}

class HttpAuthRepository implements AuthRepository {
  HttpAuthRepository(this._api, this._tokens, {OfflineCache? cache})
      : _cache = cache;

  final ApiClient _api;
  final TokenStore _tokens;
  final OfflineCache? _cache;

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on ApiException catch (e) {
      throw AuthException(e.message);
    }
  }

  /// The stored data is made this driver's (another driver's is wiped), and
  /// the profile kept so the app can open without a connection.
  Future<void> _remember(Driver driver, Map<String, dynamic> user) async {
    await _cache?.bindTo(driver.id);
    await _cache?.putJson('me', user);
  }

  @override
  Future<Driver?> currentDriver() async {
    if (await _tokens.readAccess() == null) return null;
    try {
      final data = await _api.get('/auth/me') as Map<String, dynamic>;
      final driver = driverFromJson(data);
      await _remember(driver, data);
      return driver;
    } on ApiException catch (e) {
      if (e.statusCode == 401) return null;
      if (e.isNetwork) {
        // Opening the app with no signal: the driver is still signed in, and
        // the profile saved last time is good enough to carry on with.
        final saved = await _cache?.getJson('me');
        if (saved is Map<String, dynamic>) return driverFromJson(saved);
        if (saved is Map) return driverFromJson(Map<String, dynamic>.from(saved));
      }
      rethrow;
    }
  }

  @override
  Future<Driver> login({required String phone, required String password}) =>
      _guard(() async {
        final data = await _api.post(
          '/auth/login',
          body: {'phone': phone, 'password': password},
          auth: false,
        ) as Map<String, dynamic>;
        final user = data['user'] as Map<String, dynamic>;
        final driver = driverFromJson(user);
        await _tokens.save(
          access: data['accessToken'] as String,
          refresh: data['refreshToken'] as String,
        );
        await _remember(driver, user);
        return driver;
      });

  @override
  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) => _guard(() async {
    final data = await _api.post(
      '/auth/register',
      body: {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        'password': password,
      },
      auth: false,
    ) as Map<String, dynamic>;
    return OtpChallenge(phone: phone, otpId: data['otpId'] as int);
  });

  @override
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  }) => _guard(
    () => _api.post(
      '/auth/verify-otp',
      body: {'phone': phone, 'otp': otp, 'otpId': otpId},
      auth: false,
    ),
  );

  @override
  Future<int> resendOtp({required String phone}) => _guard(() async {
    final data = await _api.post(
      '/auth/resend-otp',
      body: {'phone': phone},
      auth: false,
    ) as Map<String, dynamic>;
    return data['otpId'] as int;
  });

  @override
  Future<void> forgotPassword({required String phone}) => _guard(
    () =>
        _api.post('/auth/forgot-password', body: {'phone': phone}, auth: false),
  );

  @override
  Future<void> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  }) => _guard(
    () => _api.post(
      '/auth/reset-password',
      body: {'phone': phone, 'otp': otp, 'newPassword': newPassword},
      auth: false,
    ),
  );

  @override
  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } on ApiException {
      // Signing out locally must work with no connection.
    } finally {
      await _tokens.clear();
    }
  }
}
