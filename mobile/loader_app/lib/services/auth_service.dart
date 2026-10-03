import 'package:http/http.dart' as http;

class AuthService {
  static const _defaultBaseUrl = 'http://10.0.2.2:5000/api';

  final http.Client _client;
  final String _baseUrl;

  AuthService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl =
          (baseUrl ??
                  const String.fromEnvironment(
                    'API_BASE_URL',
                    defaultValue: _defaultBaseUrl,
                  ))
              .replaceFirst(RegExp(r'/+$'), '');

  Future<bool> login({required String email, required String password}) async {
    final uri = Uri.parse('$_baseUrl/auth/login');

    try {
      final response = await _client
          .post(
            uri,
            headers: const {'Content-Type': 'application/json'},
            body: {'phone': email.trim(), 'password': password},
          )
          .timeout(const Duration(seconds: 15));

      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}
