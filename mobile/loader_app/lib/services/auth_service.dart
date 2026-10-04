import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static final Map<String, Future<String>> _refreshes = {};
  final http.Client _client;
  final String _baseUrl;
  static const sessionKey = 'loader.session';
  AuthService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? defaultBaseUrl).replaceFirst(RegExp(r'/+$'), '');
  static String get defaultBaseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) return configured;
    return 'https://api.way-point.site/api';
  }

  static String normalizePhone(String phone) {
    final value = phone.trim().replaceAll(RegExp(r'[\s()-]'), '');
    return RegExp(r'^0\d{9}$').hasMatch(value)
        ? '+94${value.substring(1)}'
        : value;
  }

  Future<void> login({required String phone, required String password}) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'phone': normalizePhone(phone),
            'password': password,
          }),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Sign in failed. Check your phone number and password.');
    }
    final data = jsonDecode(response.body)['data'];
    if (data is! Map ||
        data['accessToken'] is! String ||
        data['refreshToken'] is! String ||
        data['user'] is! Map) {
      throw const FormatException('Invalid session response');
    }
    if (data['user']['role'] != 'loader') {
      throw StateError('Please sign in with a loader account.');
    }
    final preferences = await SharedPreferences.getInstance();
    if (!await preferences.setString(sessionKey, jsonEncode(data))) {
      throw StateError('Could not save your session.');
    }
  }

  Future<dynamic> _registrationRequest(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/auth/$path'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));
    final envelope = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = envelope['message'];
      throw StateError(
        message is List
            ? message.join('\n')
            : message?.toString() ?? 'Request failed.',
      );
    }
    return envelope['data'];
  }

  Future<int> register({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) async {
    final data = await _registrationRequest('register', {
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'phone': normalizePhone(phone),
      'password': password,
    });
    return data['otpId'] as int;
  }

  Future<void> verifyPhone({
    required String phone,
    required int otpId,
    required String otp,
  }) async {
    await _registrationRequest('verify-otp', {
      'phone': normalizePhone(phone),
      'otpId': otpId,
      'otp': otp,
    });
  }

  Future<int> resendOtp(String phone) async {
    final data = await _registrationRequest('resend-otp', {
      'phone': normalizePhone(phone),
    });
    return data['otpId'] as int;
  }

  Future<http.Response> authenticatedRequest(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(sessionKey);
    if (raw == null) throw StateError('Please sign in again.');
    final token = jsonDecode(raw)['accessToken'] as String;
    Future<http.Response> send(String token) async {
      final request = http.Request(method, Uri.parse('$_baseUrl$path'));
      request.headers.addAll({
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      });
      if (body != null) request.body = jsonEncode(body);
      return (() async => http.Response.fromStream(
        await _client.send(request),
      ))().timeout(const Duration(seconds: 15));
    }

    var response = await send(token);
    if (response.statusCode == 401) {
      final latest = preferences.getString(sessionKey);
      final latestToken = latest == null
          ? token
          : jsonDecode(latest)['accessToken'] as String;
      response = await send(
        latestToken != token ? latestToken : await _refreshToken(),
      );
      if (response.statusCode == 401) {
        await preferences.remove(sessionKey);
        throw StateError('Your session expired. Please sign in again.');
      }
    }
    return response;
  }

  Future<String> _refreshToken() async {
    final pending = _refreshes[_baseUrl];
    if (pending != null) return pending;
    final operation = _performRefresh();
    _refreshes[_baseUrl] = operation;
    try {
      return await operation;
    } finally {
      _refreshes.remove(_baseUrl);
    }
  }

  Future<String> _performRefresh() async {
    final preferences = await SharedPreferences.getInstance();
    final original = preferences.getString(sessionKey);
    if (original == null) throw StateError('Please sign in again.');
    final session = jsonDecode(original);
    if (session['refreshToken'] is! String) {
      throw StateError('Please sign in again.');
    }
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/auth/refresh'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'refreshToken': session['refreshToken']}),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401 &&
          preferences.getString(sessionKey) == original) {
        await preferences.remove(sessionKey);
      }
      throw StateError('Could not refresh your session. Please sign in again.');
    }
    final data = jsonDecode(response.body)['data'];
    if (data is! Map ||
        data['accessToken'] is! String ||
        data['refreshToken'] is! String ||
        data['user']?['role'] != 'loader') {
      throw StateError('Please sign in with a loader account.');
    }
    if (preferences.getString(sessionKey) != original) {
      throw StateError('Session changed. Please sign in again.');
    }
    if (!await preferences.setString(sessionKey, jsonEncode(data))) {
      throw StateError('Could not save your session.');
    }
    return data['accessToken'] as String;
  }

  Future<bool> hasValidToken() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(sessionKey);
    if (raw == null) return false;
    try {
      final session = jsonDecode(raw);
      final parts = (session['accessToken'] as String).split('.');
      if (parts.length != 3 || session['user']['role'] != 'loader') {
        return false;
      }
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      if (payload['exp'] is num &&
          payload['exp'] * 1000 > DateTime.now().millisecondsSinceEpoch) {
        return true;
      }
      if (session['refreshToken'] is! String) return false;
      await _refreshToken();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();
    try {
      final raw = preferences.getString(sessionKey);
      if (raw != null) {
        await _client
            .post(
              Uri.parse('$_baseUrl/auth/logout'),
              headers: {
                'Authorization': 'Bearer ${jsonDecode(raw)['accessToken']}',
              },
            )
            .timeout(const Duration(seconds: 15));
      }
    } catch (_) {
      // Local logout must still work when the server is unavailable.
    } finally {
      if (!await preferences.remove(sessionKey)) {
        throw StateError('Could not clear your session. Please try again.');
      }
    }
  }

  void dispose() => _client.close();
}
