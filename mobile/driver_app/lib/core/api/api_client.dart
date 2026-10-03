import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'token_store.dart';

const _unreachable =
    ApiException(0, "Can't reach the server. Check your connection.");

/// Thin client for the Waypoint API. Returns the envelope's `data`, throws
/// [ApiException] otherwise, and refreshes the access token once on a 401.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokens,
    http.Client? client,
    this.onSignedOut,
    this.timeout = const Duration(seconds: 15),
  }) : _http = client ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final void Function()? onSignedOut;
  final Duration timeout;
  final http.Client _http;

  Future<bool>? _refreshing;

  Future<Object?> get(String path,
          {Map<String, String>? query, bool auth = true}) =>
      _request('GET', path, query: query, auth: auth);

  Future<Object?> post(String path, {Object? body, bool auth = true}) =>
      _request('POST', path, body: body, auth: auth);

  Future<Object?> put(String path, {Object? body, bool auth = true}) =>
      _request('PUT', path, body: body, auth: auth);

  Future<Object?> patch(String path, {Object? body, bool auth = true}) =>
      _request('PATCH', path, body: body, auth: auth);

  Future<Object?> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    required bool auth,
  }) async {
    var response =
        await _send(method, path, body: body, query: query, auth: auth);
    if (response.statusCode == 401 && auth) {
      if (await _refresh()) {
        response =
            await _send(method, path, body: body, query: query, auth: auth);
      }
    }
    return _unwrap(response);
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    required bool auth,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final request = http.Request(method, uri)
      ..headers['Accept'] = 'application/json';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    if (auth) {
      final token = await tokens.readAccess();
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
    }
    try {
      return await http.Response.fromStream(
          await _http.send(request).timeout(timeout));
    } on TimeoutException {
      throw _unreachable;
    } on SocketException {
      throw _unreachable;
    } on http.ClientException {
      throw _unreachable;
    }
  }

  /// One refresh at a time: it rotates the tokens, so a second concurrent call
  /// would present an already-used refresh token and fail.
  Future<bool> _refresh() {
    final running = _refreshing;
    if (running != null) return running;
    final attempt = _doRefresh().whenComplete(() => _refreshing = null);
    _refreshing = attempt;
    return attempt;
  }

  Future<bool> _doRefresh() async {
    final refresh = await tokens.readRefresh();
    if (refresh == null) {
      await _signOut();
      return false;
    }
    final response = await _send('POST', '/auth/refresh',
        body: {'refreshToken': refresh}, auth: false);
    final body = response.statusCode == 200 ? _decode(response) : null;
    final data = body?['data'];
    if (data is Map &&
        data['accessToken'] is String &&
        data['refreshToken'] is String) {
      await tokens.save(
          access: data['accessToken'] as String,
          refresh: data['refreshToken'] as String);
      return true;
    }
    await _signOut();
    return false;
  }

  Future<void> _signOut() async {
    await tokens.clear();
    onSignedOut?.call();
  }

  Map<String, dynamic>? _decode(http.Response r) {
    try {
      final decoded = jsonDecode(utf8.decode(r.bodyBytes));
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  Object? _unwrap(http.Response r) {
    final body = _decode(r);
    if (r.statusCode >= 200 && r.statusCode < 300) return body?['data'];
    final message = body?['message'];
    throw ApiException(
      r.statusCode,
      message is String && message.isNotEmpty
          ? message
          : 'Request failed (${r.statusCode})',
      body?['data'],
    );
  }
}
