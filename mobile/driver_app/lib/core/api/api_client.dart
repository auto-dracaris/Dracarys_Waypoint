import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;

import 'api_exception.dart';
import 'token_store.dart';

const _unreachable = ApiException(
  0,
  "Can't reach the server. Check your connection.",
);

/// A file sent as multipart form data, e.g. a photo for `POST /images`.
class Upload {
  const Upload({
    required this.field,
    required this.bytes,
    required this.filename,
    this.contentType = 'image/jpeg',
  });

  final String field;
  final List<int> bytes;
  final String filename;
  final String contentType;
}

/// Thin client for the Waypoint API. Returns the envelope's `data`, throws
/// [ApiException] otherwise, and refreshes the access token once on a 401.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokens,
    http.Client? client,
    this.onSignedOut,
    this.onReachability,
    this.timeout = const Duration(seconds: 15),
  }) : _http = client ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final void Function()? onSignedOut;

  /// Told after every request whether the server could be reached (true) or
  /// the call died on the network (false). Feeds the app's online state.
  final void Function(bool reachable)? onReachability;
  final Duration timeout;
  final http.Client _http;

  Future<bool>? _refreshing;

  Future<Object?> get(
    String path, {
    Map<String, String>? query,
    bool auth = true,
  }) => _request('GET', path, query: query, auth: auth);

  Future<Object?> post(String path, {Object? body, bool auth = true}) =>
      _request('POST', path, body: body, auth: auth);

  Future<Object?> put(String path, {Object? body, bool auth = true}) =>
      _request('PUT', path, body: body, auth: auth);
  Future<Object?> patch(String path, {Object? body, bool auth = true}) =>
      _request('PATCH', path, body: body, auth: auth);

  /// Sends [file] with [fields] as `multipart/form-data` (the API's one file
  /// route is `POST /images`).
  Future<Object?> upload(
    String path, {
    required Upload file,
    Map<String, String> fields = const {},
  }) => _request('POST', path, auth: true, fields: fields, file: file);

  Future<Object?> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    required bool auth,
    Map<String, String> fields = const {},
    Upload? file,
  }) async {
    Future<http.Response> attempt() => _send(
      method,
      path,
      body: body,
      query: query,
      auth: auth,
      fields: fields,
      file: file,
    );
    var response = await attempt();
    if (response.statusCode == 401 && auth) {
      if (await _refresh()) response = await attempt();
    }
    return _unwrap(response);
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    required bool auth,
    Map<String, String> fields = const {},
    Upload? file,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final http.BaseRequest request;
    if (file != null) {
      request = http.MultipartRequest(method, uri)
        ..fields.addAll(fields)
        ..files.add(
          http.MultipartFile.fromBytes(
            file.field,
            file.bytes,
            filename: file.filename,
            contentType: MediaType.parse(file.contentType),
          ),
        );
    } else {
      final plain = http.Request(method, uri);
      if (body != null) {
        plain.headers['Content-Type'] = 'application/json';
        plain.body = jsonEncode(body);
      }
      request = plain;
    }
    request.headers['Accept'] = 'application/json';
    if (auth) {
      final token = await tokens.readAccess();
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
    }
    try {
      final response = await http.Response.fromStream(
        await _http.send(request).timeout(timeout),
      );
      onReachability?.call(true);
      return response;
    } on TimeoutException {
      onReachability?.call(false);
      throw _unreachable;
    } on SocketException {
      onReachability?.call(false);
      throw _unreachable;
    } on http.ClientException {
      onReachability?.call(false);
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
    final response = await _send(
      'POST',
      '/auth/refresh',
      body: {'refreshToken': refresh},
      auth: false,
    );
    final body = response.statusCode == 200 ? _decode(response) : null;
    final data = body?['data'];
    if (data is Map &&
        data['accessToken'] is String &&
        data['refreshToken'] is String) {
      await tokens.save(
        access: data['accessToken'] as String,
        refresh: data['refreshToken'] as String,
      );
      return true;
    }
    // Only a rejected token ends the session. A 5xx or a garbled reply is the
    // server having a bad moment: keep the 30-day session and report it.
    if (response.statusCode == 401 || response.statusCode == 403) {
      await _signOut();
      return false;
    }
    throw ApiException(
      response.statusCode,
      "Couldn't refresh the session. Try again.",
    );
  }

  /// Ends the local session. Signals only when there was one to end, so stray
  /// late 401s on a signed-out client cannot re-trigger the sign-out handler.
  Future<void> _signOut() async {
    final hadSession =
        await tokens.readAccess() != null || await tokens.readRefresh() != null;
    await tokens.clear();
    if (hadSession) onSignedOut?.call();
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
