# Driver app API wiring, stages 0-1 (groundwork, HTTP client, auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the latest backend, run it locally, and give the driver app a real HTTP client plus phone/OTP/password authentication against that local API, verified on the Android emulator.

**Architecture:** A small `ApiClient` (on the existing `http` package) unwraps the API's `{statusCode,message,data}` envelope, attaches the bearer token, and refreshes once on 401. `HttpAuthRepository` implements the existing `AuthRepository` interface (changed from email to phone); `MockAuthRepository` stays for tests and `USE_MOCKS`. Tokens live behind a `TokenStore` interface (secure storage in the app, in-memory in tests).

**Tech Stack:** Flutter 3.47 / Dart 3.13, flutter_riverpod 3, go_router 18, `http` ^1.6 (+ `package:http/testing.dart` `MockClient`), `flutter_secure_storage`, NestJS API on Postgres + RabbitMQ.

**Spec:** `docs/superpowers/specs/2026-10-04-driver-app-api-wiring-design.md`

**Later plans (not in this file):** stage 2 trips (7 statuses), stage 3 driver actions, stage 4 records/images/issues/location. They depend on real trip responses seen in stage 0-1, so each gets its own plan after this one is verified.

## Global Constraints

- App dir is `mobile/driver_app`; run all `flutter` commands from there. Package name `driver_app`.
- Base URL comes from `--dart-define=API_BASE_URL`; emulator default `http://10.0.2.2:5000/api`. Mock repos selected by `--dart-define=USE_MOCKS=true`.
- Cleartext HTTP allowed in the **debug** manifest only (`android/app/src/debug/AndroidManifest.xml`).
- Login is by **phone** + password. Password rule for sign-up and reset (API): at least 6 chars, one uppercase letter, one special char from `!@#$%^&*(),.?":{}|<>`. Login only needs 6+ chars.
- Sign-up is `firstName, lastName, phone, password`, then OTP (`otp` exactly 6 digits, `otpId` integer).
- Envelope: `{ "statusCode": int, "message": string, "data": any }`. Errors use the same shape; validation errors have `message` = first problem, `data` = full list.
- 401 handling: refresh once with `POST /auth/refresh {refreshToken}` (rotates both tokens), retry once; if refresh fails, clear tokens and sign out. `POST /auth/login` and other unauthenticated calls never trigger a refresh.
- Only role `driver` may use the app; a non-driver login is rejected and no tokens are kept.
- Every task ends with `flutter analyze` clean and `flutter test` green; commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Do not commit `mobile/driver_app/android/build/`.

## Review Focus

- Expired access token with a valid refresh token mid-session: request is retried transparently, user stays signed in (Task 3 test).
- Refresh token rejected (revoked / replayed): user is signed out, not left in a broken loading state (Task 3 test).
- Several requests get 401 at once: only one refresh call is made, since refresh rotates tokens and a second call would fail (Task 3 test).
- Server unreachable (API not running, emulator offline): clear "can't reach the server" error, and the session is NOT cleared (Task 3 + Task 6 tests).
- Phone typed with spaces, dashes or `+94`/`94`/`0` prefix: accepted by the form (Task 5 test); the raw string is sent and the API normalizes it.
- Account in `pending` state (registered, OTP not verified) tries to log in: shows the API's "verify your phone first" message (Task 6 test).
- A loader/dispatcher account signs in on the driver app: rejected, no tokens saved (Task 6 test).

---

## File Structure

Create:
- `lib/core/api/api_exception.dart`: `ApiException` (status, message, data, `isNetwork`).
- `lib/core/api/token_store.dart`: `TokenStore` interface + `InMemoryTokenStore`.
- `lib/core/api/secure_token_store.dart`: `SecureTokenStore` on flutter_secure_storage.
- `lib/core/api/api_client.dart`: `ApiClient`.
- `lib/core/api/api_config.dart`: `apiBaseUrl`, `useMocks` compile-time constants.
- `lib/core/api/api_providers.dart`: `tokenStoreProvider`, `apiClientProvider`.
- `lib/features/auth/data/http_auth_repository.dart`: `HttpAuthRepository` + `driverFromJson`.
- `lib/features/auth/presentation/otp_screen.dart`, `forgot_password_screen.dart`, `reset_password_screen.dart`.
- Tests: `test/core/api/api_client_test.dart`, `test/features/auth/http_auth_repository_test.dart`, `test/features/auth/otp_flow_test.dart`.

Modify:
- `lib/features/auth/domain/driver.dart` (add `DriverVehicle`, `Driver.vehicle`).
- `lib/features/auth/data/auth_repository.dart` (phone-based interface, `OtpChallenge`).
- `lib/features/auth/data/mock_auth_repository.dart`, `auth_providers.dart`.
- `lib/features/auth/presentation/auth_controller.dart`, `validators.dart`, `login_screen.dart`, `signup_screen.dart`.
- `lib/core/router/app_router.dart`, `auth_redirect.dart`.
- Tests: `test/app_flow_test.dart`, `test/features/auth/*`, `test/core/router/auth_redirect_test.dart`.
- `pubspec.yaml`, `android/app/src/debug/AndroidManifest.xml`, `API_README.md` (conflict resolution only).

---

### Task 1: Commit pending work and merge the latest backend

**Files:**
- Modify: `mobile/driver_app/API_README.md` (only if the merge conflicts)

**Interfaces:**
- Produces: `feat/live-navigation` containing `origin/main` (API with trips, orders, issues, images; updated `API_README.md`).

- [ ] **Step 1: Commit the pending trip-card illustration change**

```bash
cd /c/Users/sulit/Documents/Way/Dracarys_Waypoint
git add mobile/driver_app/lib/features/trips/presentation/widgets/trip_card.dart mobile/driver_app/test/features/trips/my_trips_screen_test.dart
git commit -m "feat(trips): show a status illustration on every trip card

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git status --short
```
Expected: only `?? mobile/driver_app/android/build/` remains.

- [ ] **Step 2: Fetch and merge origin/main**

```bash
git fetch origin
git merge origin/main
```
Expected: a merge commit. If `API_README.md` conflicts, take the `origin/main` side (`git checkout --theirs mobile/driver_app/API_README.md`), `git add` it, `git commit --no-edit`. If any file under `mobile/driver_app/lib` or `test` conflicts, STOP and report it; do not guess.

- [ ] **Step 3: Verify the app still builds and passes**

```bash
cd mobile/driver_app
flutter pub get
flutter analyze
flutter test
```
Expected: analyze "No issues found", all tests pass (194).

No extra commit needed (the merge is the commit).

---

### Task 2: Run the API locally

No code changes. Produces a running local API with a seeded, active demo driver.

**Files:**
- Create (untracked, never commit): `api/.env`

**Interfaces:**
- Produces: API at `http://localhost:5000/api` (emulator sees it at `http://10.0.2.2:5000/api`); demo driver phone `0770000002`, password `111111`; Postgres on host port 5433, RabbitMQ on 5672.

- [ ] **Step 1: Check prerequisites**

```bash
docker --version
node --version
```
Expected: both print versions. **Docker was not on PATH when this plan was written.** If `docker` is missing, STOP and ask the user to install Docker Desktop (or provide native Postgres 16 on port 5433 and RabbitMQ on 5672 with the credentials in `docker-compose.yml`), then continue.

- [ ] **Step 2: Start Postgres and RabbitMQ**

```bash
cd /c/Users/sulit/Documents/Way/Dracarys_Waypoint
docker compose up -d postgres rabbitmq
docker compose ps
```
Expected: both services `healthy` (give it up to a minute).

- [ ] **Step 3: Create `api/.env` from the example and enable the demo accounts**

```bash
cd api
cp .env.example .env
```
The example already sets `DEMO_DRIVER_PASSWORD=111111` and `DEMO_DRIVER_PHONE=0770000002`, so no edit is needed for the driver. Do NOT put real SMS credentials anywhere new; the key that ships in `.env.example` is the team's. (Tell the user a live-looking SMS API key is committed in `.env.example`; they should rotate it and move it out.)

- [ ] **Step 4: Install and start the API**

```bash
npm ci
npm run start
```
Run `npm run start` in the background. Expected log lines include migrations running and `Nest application successfully started`.

- [ ] **Step 5: Smoke test health and driver login**

```bash
curl -s http://localhost:5000/api/health
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"phone":"0770000002","password":"111111"}'
```
Expected: health shows `"status":"ok"`; login returns `statusCode 200` and `data.accessToken`, `data.refreshToken`, `data.user.role == "driver"`, `data.user.driver.code`. Save the JSON of `data.user` into `docs/superpowers/plans/` is NOT needed; just confirm field names match the plan (`driver.code`, `driver.depot`, `driver.vehicle.{id,plate,type}`). If a field differs, update the Global Constraints and Task 5/6 code before continuing.

---

### Task 3: ApiClient (envelope, bearer, refresh, errors)

**Files:**
- Create: `lib/core/api/api_exception.dart`, `lib/core/api/token_store.dart`, `lib/core/api/api_client.dart`
- Test: `test/core/api/api_client_test.dart`

**Interfaces:**
- Produces:
  - `class ApiException implements Exception { const ApiException(this.statusCode, this.message, [this.data]); final int statusCode; final String message; final Object? data; bool get isNetwork => statusCode == 0; }`
  - `abstract interface class TokenStore { Future<String?> readAccess(); Future<String?> readRefresh(); Future<void> save({required String access, required String refresh}); Future<void> clear(); }` and `class InMemoryTokenStore implements TokenStore` (constructor `InMemoryTokenStore({String? access, String? refresh})`).
  - `class ApiClient { ApiClient({required String baseUrl, required TokenStore tokens, http.Client? client, void Function()? onSignedOut, Duration timeout = const Duration(seconds: 15)}); Future<Object?> get(String path, {Map<String,String>? query, bool auth = true}); Future<Object?> post(String path, {Object? body, bool auth = true}); Future<Object?> put(String path, {Object? body, bool auth = true}); Future<Object?> patch(String path, {Object? body, bool auth = true}); }` each returning the envelope's `data`.

- [ ] **Step 1: Write the failing tests**

Create `test/core/api/api_client_test.dart`:

```dart
import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
        jsonEncode({'statusCode': status, 'message': message, 'data': data}),
        status,
        headers: {'content-type': 'application/json'});

ApiClient clientWith(
  MockClient mock, {
  TokenStore? tokens,
  void Function()? onSignedOut,
}) =>
    ApiClient(
      baseUrl: 'http://api.test/api',
      tokens: tokens ?? InMemoryTokenStore(access: 'A1', refresh: 'R1'),
      client: mock,
      onSignedOut: onSignedOut,
    );

void main() {
  test('returns the envelope data and sends the bearer token', () async {
    late http.Request seen;
    final api = clientWith(MockClient((req) async {
      seen = req;
      return envelope(200, 'ok', {'x': 1});
    }));
    final data = await api.get('/trips', query: {'page': '1'});
    expect(data, {'x': 1});
    expect(seen.url.toString(), 'http://api.test/api/trips?page=1');
    expect(seen.headers['Authorization'], 'Bearer A1');
  });

  test('post sends a JSON body', () async {
    late http.Request seen;
    final api = clientWith(MockClient((req) async {
      seen = req;
      return envelope(201, 'created', null);
    }));
    await api.post('/issues', body: {'type': 'other'});
    expect(jsonDecode(seen.body), {'type': 'other'});
    expect(seen.headers['Content-Type'], contains('application/json'));
  });

  test('a non-2xx throws ApiException with message and data', () async {
    final api = clientWith(MockClient(
        (_) async => envelope(409, 'Trip is not ready', {'id': 'trip-1'})));
    await expectLater(
      api.post('/trips/x/start', body: {}),
      throwsA(isA<ApiException>()
          .having((e) => e.statusCode, 'statusCode', 409)
          .having((e) => e.message, 'message', 'Trip is not ready')
          .having((e) => e.data, 'data', {'id': 'trip-1'})),
    );
  });

  test('a non-JSON error body still throws a usable ApiException', () async {
    final api =
        clientWith(MockClient((_) async => http.Response('<html>', 502)));
    await expectLater(
      api.get('/routing/route'),
      throwsA(isA<ApiException>()
          .having((e) => e.statusCode, 'statusCode', 502)
          .having((e) => e.message, 'message', isNotEmpty)),
    );
  });

  test('on 401 it refreshes once, saves rotated tokens and retries', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    final calls = <String>[];
    final api = clientWith(
      MockClient((req) async {
        calls.add('${req.method} ${req.url.path} ${req.headers['Authorization']}');
        if (req.url.path.endsWith('/auth/refresh')) {
          expect(jsonDecode(req.body), {'refreshToken': 'R1'});
          return envelope(200, 'ok',
              {'accessToken': 'new', 'refreshToken': 'R2', 'user': {}});
        }
        return req.headers['Authorization'] == 'Bearer new'
            ? envelope(200, 'ok', {'ok': true})
            : envelope(401, 'Unauthorized');
      }),
      tokens: tokens,
    );
    expect(await api.get('/trips'), {'ok': true});
    expect(await tokens.readAccess(), 'new');
    expect(await tokens.readRefresh(), 'R2');
    expect(calls, [
      'GET /api/trips Bearer old',
      'POST /api/auth/refresh null',
      'GET /api/trips Bearer new',
    ]);
  });

  test('when refresh is rejected it signs out and throws 401', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var signedOut = 0;
    final api = clientWith(
      MockClient((req) async => req.url.path.endsWith('/auth/refresh')
          ? envelope(401, 'Invalid refresh token')
          : envelope(401, 'Unauthorized')),
      tokens: tokens,
      onSignedOut: () => signedOut++,
    );
    await expectLater(api.get('/trips'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
    expect(await tokens.readAccess(), isNull);
    expect(await tokens.readRefresh(), isNull);
    expect(signedOut, 1);
  });

  test('concurrent 401s trigger a single refresh', () async {
    final tokens = InMemoryTokenStore(access: 'old', refresh: 'R1');
    var refreshes = 0;
    final api = clientWith(
      MockClient((req) async {
        if (req.url.path.endsWith('/auth/refresh')) {
          refreshes++;
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return envelope(200, 'ok',
              {'accessToken': 'new', 'refreshToken': 'R2', 'user': {}});
        }
        return req.headers['Authorization'] == 'Bearer new'
            ? envelope(200, 'ok', 1)
            : envelope(401, 'Unauthorized');
      }),
      tokens: tokens,
    );
    final results = await Future.wait([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(results, [1, 1, 1]);
    expect(refreshes, 1);
  });

  test('auth:false 401 is returned as an error without refreshing', () async {
    var refreshes = 0;
    final api = clientWith(MockClient((req) async {
      if (req.url.path.endsWith('/auth/refresh')) refreshes++;
      return envelope(401, 'Invalid phone number or password');
    }));
    await expectLater(
      api.post('/auth/login', body: {'phone': 'x', 'password': 'y'}, auth: false),
      throwsA(isA<ApiException>()
          .having((e) => e.message, 'message', 'Invalid phone number or password')),
    );
    expect(refreshes, 0);
  });

  test('network failure throws a network ApiException and keeps the session',
      () async {
    final tokens = InMemoryTokenStore(access: 'A1', refresh: 'R1');
    final api = clientWith(
        MockClient((_) async => throw http.ClientException('no route')),
        tokens: tokens);
    await expectLater(api.get('/trips'),
        throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', true)));
    expect(await tokens.readAccess(), 'A1');
  });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `flutter test test/core/api/api_client_test.dart`
Expected: FAIL (compile errors: `api_client.dart`, `api_exception.dart`, `token_store.dart` do not exist).

- [ ] **Step 3: Implement**

`lib/core/api/api_exception.dart`:

```dart
/// A failed API call. [statusCode] 0 means the server could not be reached.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.message, [this.data]);

  final int statusCode;
  final String message;

  /// The envelope's `data`: the full validation list, or the current trip on 409.
  final Object? data;

  bool get isNetwork => statusCode == 0;

  @override
  String toString() => message;
}
```

`lib/core/api/token_store.dart`:

```dart
abstract interface class TokenStore {
  Future<String?> readAccess();
  Future<String?> readRefresh();
  Future<void> save({required String access, required String refresh});
  Future<void> clear();
}

class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore({String? access, String? refresh})
      : _access = access,
        _refresh = refresh;

  String? _access;
  String? _refresh;

  @override
  Future<String?> readAccess() async => _access;

  @override
  Future<String?> readRefresh() async => _refresh;

  @override
  Future<void> save({required String access, required String refresh}) async {
    _access = access;
    _refresh = refresh;
  }

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
  }
}
```

`lib/core/api/api_client.dart`:

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'token_store.dart';

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
    var response = await _send(method, path, body: body, query: query, auth: auth);
    if (response.statusCode == 401 && auth) {
      if (await _refresh()) {
        response = await _send(method, path, body: body, query: query, auth: auth);
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
      throw const ApiException(0, "Can't reach the server. Check your connection.");
    } on SocketException {
      throw const ApiException(0, "Can't reach the server. Check your connection.");
    } on http.ClientException {
      throw const ApiException(0, "Can't reach the server. Check your connection.");
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
    final data = response.statusCode == 200 ? _decode(response)?['data'] : null;
    if (data is Map && data['accessToken'] is String && data['refreshToken'] is String) {
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `flutter test test/core/api/api_client_test.dart`
Expected: PASS (9 tests).

- [ ] **Step 5: Analyze and commit**

```bash
flutter analyze
git add lib/core/api test/core/api
git commit -m "feat(api): ApiClient with envelope unwrapping and single-flight token refresh

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Config, secure token store, providers, debug cleartext

**Files:**
- Create: `lib/core/api/api_config.dart`, `lib/core/api/secure_token_store.dart`, `lib/core/api/api_providers.dart`
- Modify: `pubspec.yaml`, `android/app/src/debug/AndroidManifest.xml`

**Interfaces:**
- Consumes: `ApiClient`, `TokenStore` (Task 3).
- Produces: `const String apiBaseUrl`, `const bool useMocks`, `final tokenStoreProvider = Provider<TokenStore>`, `final apiClientProvider = Provider<ApiClient>`, `SecureTokenStore implements TokenStore`.

- [ ] **Step 1: Add the dependency**

```bash
flutter pub add flutter_secure_storage
```
Expected: `pubspec.yaml` gains `flutter_secure_storage`, `flutter pub get` succeeds.

- [ ] **Step 2: Create `lib/core/api/api_config.dart`**

```dart
/// Where the API lives. The emulator reaches the host machine at 10.0.2.2.
/// Override with `--dart-define=API_BASE_URL=https://...` when it is hosted.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api');

/// `--dart-define=USE_MOCKS=true` runs the app on the in-memory repositories.
const useMocks = bool.fromEnvironment('USE_MOCKS');
```

- [ ] **Step 3: Create `lib/core/api/secure_token_store.dart`**

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'token_store.dart';

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  final FlutterSecureStorage _storage;

  @override
  Future<String?> readAccess() => _storage.read(key: _accessKey);

  @override
  Future<String?> readRefresh() => _storage.read(key: _refreshKey);

  @override
  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
```

- [ ] **Step 4: Create `lib/core/api/api_providers.dart`**

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import 'api_client.dart';
import 'api_config.dart';
import 'secure_token_store.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(
      baseUrl: apiBaseUrl,
      tokens: ref.watch(tokenStoreProvider),
      // A failed refresh means the session is gone: re-run auth so the router
      // sends the driver to /login.
      onSignedOut: () => ref.invalidate(authControllerProvider),
    ));
```

- [ ] **Step 5: Allow cleartext HTTP in the debug manifest only**

Edit `android/app/src/debug/AndroidManifest.xml`, add the `<application>` element after the permission:

```xml
    <uses-permission android:name="android.permission.INTERNET"/>
    <application android:usesCleartextTraffic="true" />
```

- [ ] **Step 6: Verify and commit**

```bash
flutter analyze
flutter test
git add pubspec.yaml pubspec.lock lib/core/api android/app/src/debug/AndroidManifest.xml
git commit -m "feat(api): build-time API config, secure token store and providers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
Expected: analyze clean, tests green (providers are not used yet).

---

### Task 5: Phone-based AuthRepository, Driver model, validators, mock

This changes the interface, so the mock, controller, screens' call sites and tests move together. Screens change in Task 7; here we keep them compiling by updating call sites minimally.

**Files:**
- Modify: `lib/features/auth/domain/driver.dart`, `lib/features/auth/data/auth_repository.dart`, `lib/features/auth/data/mock_auth_repository.dart`, `lib/features/auth/presentation/auth_controller.dart`, `lib/features/auth/presentation/validators.dart`, `lib/features/auth/presentation/login_screen.dart`, `lib/features/auth/presentation/signup_screen.dart`
- Test: `test/features/auth/validators_test.dart`, `test/features/auth/mock_auth_repository_test.dart`, `test/features/auth/auth_failures_test.dart`, `test/app_flow_test.dart`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `class DriverVehicle { const DriverVehicle({required this.id, required this.plate, required this.type}); final int id; final String plate; final String type; }`
  - `Driver({required id, required name, required code, required depot, DriverVehicle? vehicle})`, field `final DriverVehicle? vehicle`.
  - `class OtpChallenge { const OtpChallenge({required this.phone, required this.otpId}); final String phone; final int otpId; }`
  - `AuthRepository`: `currentDriver()`, `login({required String phone, required String password}) → Driver`, `signUp({required String firstName, required String lastName, required String phone, required String password}) → OtpChallenge`, `verifyOtp({required String phone, required String otp, required int otpId}) → void`, `resendOtp({required String phone}) → void`, `forgotPassword({required String phone}) → void`, `resetPassword({required String phone, required String otp, required String newPassword}) → void`, `logout() → void`.
  - Validators: `validatePhone(String?)`, `validateNewPassword(String?)`, `validateOtp(String?)`, `validateFirstName`/`validateLastName` (reuse non-empty rule). `validateEmail`/`validateName` are removed.
  - `AuthController`: `login({phone,password})`, `signUp(...) → Future<OtpChallenge>`, `verifyOtp`, `resendOtp`, `forgotPassword`, `resetPassword`, `logout`.

- [ ] **Step 1: Write the failing tests**

Replace `test/features/auth/validators_test.dart`:

```dart
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
    for (final bad in [null, '', '   ', '12345', '0112345678', 'abcdefghij', '07700000']) {
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
```

Replace `test/features/auth/mock_auth_repository_test.dart`:

```dart
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

MockAuthRepository repo() => MockAuthRepository(latency: Duration.zero);

void main() {
  test('login returns the demo driver and sets the session', () async {
    final r = repo();
    expect(await r.currentDriver(), isNull);
    final d = await r.login(phone: '0770000002', password: 'secret1');
    expect(d.name, 'Nimal Silva');
    expect(d.initials, 'NS');
    expect((await r.currentDriver())!.code, 'DRV021');
  });

  test('login rejects a short password', () async {
    expect(() => repo().login(phone: '0770000002', password: '123'),
        throwsA(isA<AuthException>()));
  });

  test('signUp needs the OTP before the account can sign in', () async {
    final r = repo();
    final challenge = await r.signUp(
        firstName: 'Kasun',
        lastName: 'Perera',
        phone: '0771111111',
        password: 'Secret1!');
    expect(challenge.phone, '0771111111');
    expect(
        () => r.login(phone: '0771111111', password: 'Secret1!'),
        throwsA(isA<AuthException>()
            .having((e) => e.message, 'message', contains('verify'))));
    await r.verifyOtp(phone: '0771111111', otp: '123456', otpId: challenge.otpId);
    final d = await r.login(phone: '0771111111', password: 'Secret1!');
    expect(d.name, 'Kasun Perera');
    expect(d.initials, 'KP');
    await r.logout();
    expect(await r.currentDriver(), isNull);
  });

  test('a wrong OTP is rejected', () async {
    final r = repo();
    final c = await r.signUp(
        firstName: 'A', lastName: 'B', phone: '0772222222', password: 'Secret1!');
    expect(() => r.verifyOtp(phone: '0772222222', otp: '000000', otpId: c.otpId),
        throwsA(isA<AuthException>()));
  });

  test('signUp with an existing phone throws AuthException', () async {
    final r = repo();
    await r.signUp(
        firstName: 'A', lastName: 'B', phone: '0773333333', password: 'Secret1!');
    expect(
        () => r.signUp(
            firstName: 'C',
            lastName: 'D',
            phone: '0773333333',
            password: 'Secret1!'),
        throwsA(isA<AuthException>()));
  });
}
```

Update `test/features/auth/auth_failures_test.dart` and `test/app_flow_test.dart` for the new signatures and keys (`phone` replaces `email`; sign-up keys `firstName`, `lastName`, `phone`, `password`, `confirm`). Read each file, then change: `login({required String email,...})` to `login({required String phone,...})`; the broken repo's `signUp` to the new signature returning `OtpChallenge`; `Key('email')` to `Key('phone')`; `'nimal@waypoint.lk'` to `'0770000002'`; `'Enter a valid email'` to `'Enter a valid mobile number'`; the duplicate-signup test to use phone `'0771111111'` twice with password `'Secret1!'` and expect `'This phone number is already registered'`.

- [ ] **Step 2: Run to verify they fail**

Run: `flutter test test/features/auth`
Expected: FAIL (compile errors: `validatePhone`, `OtpChallenge`, etc. missing).

- [ ] **Step 3: Implement**

`lib/features/auth/domain/driver.dart`:

```dart
class DriverVehicle {
  const DriverVehicle(
      {required this.id, required this.plate, required this.type});

  final int id;
  final String plate;
  final String type;
}

class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.code,
    required this.depot,
    this.vehicle,
  });

  final String id;
  final String name;
  final String code;
  final String depot;
  final DriverVehicle? vehicle;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
```

`lib/features/auth/data/auth_repository.dart`:

```dart
import '../domain/driver.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Where a sign-up stands: the code was sent and must be confirmed.
class OtpChallenge {
  const OtpChallenge({required this.phone, required this.otpId});

  final String phone;
  final int otpId;
}

abstract interface class AuthRepository {
  Future<Driver?> currentDriver();
  Future<Driver> login({required String phone, required String password});
  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  });
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  });
  Future<void> resendOtp({required String phone});
  Future<void> forgotPassword({required String phone});
  Future<void> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  });
  Future<void> logout();
}
```

`lib/features/auth/data/mock_auth_repository.dart`:

```dart
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
  Driver? _current;

  Future<void> _wait() => Future<void>.delayed(latency);
  String _key(String phone) => phone.replaceAll(RegExp(r'[^0-9]'), '');

  @override
  Future<Driver?> currentDriver() async {
    await _wait();
    return _current;
  }

  @override
  Future<Driver> login({required String phone, required String password}) async {
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
    return OtpChallenge(phone: phone, otpId: n);
  }

  @override
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  }) async {
    await _wait();
    if (otp != validOtp) {
      throw const AuthException('Invalid or expired code');
    }
    _pending.remove(_key(phone));
  }

  @override
  Future<void> resendOtp({required String phone}) => _wait();

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
```

`lib/features/auth/presentation/validators.dart`:

```dart
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

String? validateOtp(String? v) =>
    RegExp(r'^\d{6}$').hasMatch((v ?? '').trim()) ? null : 'Enter the 6-digit code';

String? validateName(String? v) =>
    (v ?? '').trim().isEmpty ? 'Enter your name' : null;

String? validateConfirm(String? confirm, String password) =>
    confirm == password ? null : 'Passwords do not match';
```

`lib/features/auth/presentation/auth_controller.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_providers.dart';
import '../data/auth_repository.dart';
import '../domain/driver.dart';

/// State is the signed-in driver, or null when signed out. Methods throw
/// AuthException on failure and leave state untouched so the form can show the
/// message itself. Only [login] changes who is signed in.
class AuthController extends AsyncNotifier<Driver?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<Driver?> build() => _repo.currentDriver();

  Future<void> login({required String phone, required String password}) async {
    state = AsyncData(await _repo.login(phone: phone, password: password));
  }

  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) =>
      _repo.signUp(
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          password: password);

  Future<void> verifyOtp(
          {required String phone, required String otp, required int otpId}) =>
      _repo.verifyOtp(phone: phone, otp: otp, otpId: otpId);

  Future<void> resendOtp({required String phone}) =>
      _repo.resendOtp(phone: phone);

  Future<void> forgotPassword({required String phone}) =>
      _repo.forgotPassword(phone: phone);

  Future<void> resetPassword(
          {required String phone,
          required String otp,
          required String newPassword}) =>
      _repo.resetPassword(phone: phone, otp: otp, newPassword: newPassword);

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, Driver?>(AuthController.new);
```

Minimal screen call-site changes so everything compiles (full screen work is Task 7): in `login_screen.dart` rename the controller to `_phone`, key `Key('phone')`, label `Phone number`, `keyboardType: TextInputType.phone`, `validator: validatePhone`, and call `.login(phone: _phone.text.trim(), password: _password.text)`. In `signup_screen.dart` replace the name+email fields with `firstName`/`lastName`/`phone` fields (keys `Key('firstName')`, `Key('lastName')`, `Key('phone')`; validators `validateName`, `validateName`, `validatePhone`), use `validateNewPassword` for the password field, and call `.signUp(firstName:..., lastName:..., phone:..., password:...)`, ignoring the returned challenge for now (Task 7 navigates with it).

- [ ] **Step 4: Run to verify it passes**

Run: `flutter test`
Expected: PASS. Fix any remaining test using `email` the same way as in Step 1.

- [ ] **Step 5: Analyze and commit**

```bash
flutter analyze
git add lib test
git commit -m "feat(auth): phone-based AuthRepository, OTP-aware mock and validators

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: HttpAuthRepository and provider selection

**Files:**
- Create: `lib/features/auth/data/http_auth_repository.dart`
- Modify: `lib/features/auth/data/auth_providers.dart`
- Test: `test/features/auth/http_auth_repository_test.dart`

**Interfaces:**
- Consumes: `ApiClient`, `ApiException`, `TokenStore`, `InMemoryTokenStore` (Task 3), `AuthRepository`, `OtpChallenge`, `Driver`, `DriverVehicle` (Task 5), `useMocks`, `tokenStoreProvider`, `apiClientProvider` (Task 4).
- Produces: `HttpAuthRepository(ApiClient api, TokenStore tokens)`; top-level `Driver driverFromJson(Map<String, dynamic> user)` (throws `AuthException('This app is for drivers only')` for a non-driver).

- [ ] **Step 1: Write the failing tests**

`test/features/auth/http_auth_repository_test.dart`:

```dart
import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/token_store.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/http_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
        jsonEncode({'statusCode': status, 'message': message, 'data': data}),
        status,
        headers: {'content-type': 'application/json'});

Map<String, dynamic> userJson({String role = 'driver', bool withDriver = true}) => {
      'id': 12,
      'firstName': 'Kasun',
      'lastName': 'Perera',
      'phone': '94771234567',
      'role': role,
      'status': 'active',
      if (withDriver)
        'driver': {
          'code': 'DRV-0012',
          'depot': 'Peliyagoda',
          'depotLocation': {'lat': 6.9645, 'lng': 79.888},
          'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
        },
    };

({HttpAuthRepository repo, InMemoryTokenStore tokens, List<http.Request> sent})
    build(http.Response Function(http.Request) respond) {
  final tokens = InMemoryTokenStore();
  final sent = <http.Request>[];
  final api = ApiClient(
    baseUrl: 'http://api.test/api',
    tokens: tokens,
    client: MockClient((req) async {
      sent.add(req);
      return respond(req);
    }),
  );
  return (repo: HttpAuthRepository(api, tokens), tokens: tokens, sent: sent);
}

void main() {
  test('driverFromJson maps the profile and vehicle', () {
    final d = driverFromJson(userJson());
    expect(d.id, '12');
    expect(d.name, 'Kasun Perera');
    expect(d.initials, 'KP');
    expect(d.code, 'DRV-0012');
    expect(d.depot, 'Peliyagoda');
    expect(d.vehicle!.id, 21);
    expect(d.vehicle!.plate, 'VEH021');
    expect(d.vehicle!.type, 'Refrigerated van');
  });

  test('driverFromJson tolerates a driver with no vehicle', () {
    final json = userJson();
    (json['driver'] as Map)['vehicle'] = null;
    expect(driverFromJson(json).vehicle, isNull);
  });

  test('driverFromJson rejects non-drivers', () {
    expect(() => driverFromJson(userJson(role: 'loader', withDriver: false)),
        throwsA(isA<AuthException>()));
  });

  test('login stores tokens and returns the driver', () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/login');
      expect(jsonDecode(req.body), {'phone': '0770000002', 'password': '111111'});
      return envelope(200, 'Logged in successfully',
          {'accessToken': 'A', 'refreshToken': 'R', 'user': userJson()});
    });
    final d = await t.repo.login(phone: '0770000002', password: '111111');
    expect(d.name, 'Kasun Perera');
    expect(await t.tokens.readAccess(), 'A');
    expect(await t.tokens.readRefresh(), 'R');
  });

  test('login by a non-driver keeps no tokens', () async {
    final t = build((_) => envelope(200, 'ok', {
          'accessToken': 'A',
          'refreshToken': 'R',
          'user': userJson(role: 'loader', withDriver: false)
        }));
    await expectLater(t.repo.login(phone: '0770000003', password: '111111'),
        throwsA(isA<AuthException>()));
    expect(await t.tokens.readAccess(), isNull);
  });

  test('login surfaces the API message (wrong password, pending account)',
      () async {
    final t = build((_) => envelope(
        401, 'Please verify your phone number with the OTP first'));
    await expectLater(
        t.repo.login(phone: '0771111111', password: 'Secret1!'),
        throwsA(isA<AuthException>().having(
            (e) => e.message, 'message', contains('verify your phone'))));
  });

  test('an unreachable server is an AuthException and keeps the session',
      () async {
    final t = build((_) => throw http.ClientException('down'));
    await t.tokens.save(access: 'A', refresh: 'R');
    await expectLater(t.repo.login(phone: '0770000002', password: '111111'),
        throwsA(isA<AuthException>()));
    expect(await t.tokens.readAccess(), 'A');
  });

  test('currentDriver is null without a token and makes no request', () async {
    final t = build((_) => envelope(200, 'ok', userJson()));
    expect(await t.repo.currentDriver(), isNull);
    expect(t.sent, isEmpty);
  });

  test('currentDriver loads /auth/me when signed in', () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/me');
      return envelope(200, 'ok', userJson());
    });
    await t.tokens.save(access: 'A', refresh: 'R');
    expect((await t.repo.currentDriver())!.code, 'DRV-0012');
  });

  test('currentDriver is null when the session is dead (401, refresh fails)',
      () async {
    final t = build((_) => envelope(401, 'Unauthorized'));
    await t.tokens.save(access: 'A', refresh: 'R');
    expect(await t.repo.currentDriver(), isNull);
  });

  test('signUp posts the exact fields and returns the OTP challenge', () async {
    final t = build((req) {
      expect(req.url.path, '/api/auth/register');
      expect(jsonDecode(req.body), {
        'firstName': 'Kasun',
        'lastName': 'Perera',
        'phone': '0771111111',
        'password': 'Secret1!',
      });
      return envelope(201, 'registered', {'userId': 30, 'otpId': 7});
    });
    final c = await t.repo.signUp(
        firstName: 'Kasun',
        lastName: 'Perera',
        phone: '0771111111',
        password: 'Secret1!');
    expect(c.otpId, 7);
    expect(c.phone, '0771111111');
  });

  test('verifyOtp, resendOtp, forgotPassword and resetPassword hit the right paths',
      () async {
    final seen = <String, Object?>{};
    final t = build((req) {
      seen[req.url.path] = jsonDecode(req.body);
      return envelope(200, 'ok', null);
    });
    await t.repo.verifyOtp(phone: '0771111111', otp: '123456', otpId: 7);
    await t.repo.resendOtp(phone: '0771111111');
    await t.repo.forgotPassword(phone: '0771111111');
    await t.repo
        .resetPassword(phone: '0771111111', otp: '654321', newPassword: 'Newpass1!');
    expect(seen, {
      '/api/auth/verify-otp': {'phone': '0771111111', 'otp': '123456', 'otpId': 7},
      '/api/auth/resend-otp': {'phone': '0771111111'},
      '/api/auth/forgot-password': {'phone': '0771111111'},
      '/api/auth/reset-password': {
        'phone': '0771111111',
        'otp': '654321',
        'newPassword': 'Newpass1!'
      },
    });
  });

  test('logout calls the API and clears tokens even if the call fails', () async {
    final t = build((_) => throw http.ClientException('down'));
    await t.tokens.save(access: 'A', refresh: 'R');
    await t.repo.logout();
    expect(await t.tokens.readAccess(), isNull);
    expect(await t.tokens.readRefresh(), isNull);
  });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `flutter test test/features/auth/http_auth_repository_test.dart`
Expected: FAIL (compile error: `http_auth_repository.dart` missing).

- [ ] **Step 3: Implement**

`lib/features/auth/data/http_auth_repository.dart`:

```dart
import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/token_store.dart';
import '../domain/driver.dart';
import 'auth_repository.dart';

/// Maps the API's `user` (login, refresh, `/auth/me`) to a [Driver].
Driver driverFromJson(Map<String, dynamic> user) {
  final driver = user['driver'];
  if (user['role'] != 'driver' || driver is! Map<String, dynamic>) {
    throw const AuthException('This app is for drivers only');
  }
  final vehicle = driver['vehicle'];
  return Driver(
    id: '${user['id']}',
    name: '${user['firstName']} ${user['lastName']}'.trim(),
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
  HttpAuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStore _tokens;

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } on ApiException catch (e) {
      throw AuthException(e.message);
    }
  }

  @override
  Future<Driver?> currentDriver() async {
    if (await _tokens.readAccess() == null) return null;
    try {
      final data = await _api.get('/auth/me');
      return driverFromJson(data as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.statusCode == 401) return null;
      rethrow;
    }
  }

  @override
  Future<Driver> login({required String phone, required String password}) =>
      _guard(() async {
        final data = await _api.post('/auth/login',
            body: {'phone': phone, 'password': password}, auth: false)
            as Map<String, dynamic>;
        final driver = driverFromJson(data['user'] as Map<String, dynamic>);
        await _tokens.save(
            access: data['accessToken'] as String,
            refresh: data['refreshToken'] as String);
        return driver;
      });

  @override
  Future<OtpChallenge> signUp({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
  }) =>
      _guard(() async {
        final data = await _api.post('/auth/register', body: {
          'firstName': firstName,
          'lastName': lastName,
          'phone': phone,
          'password': password,
        }, auth: false) as Map<String, dynamic>;
        return OtpChallenge(phone: phone, otpId: data['otpId'] as int);
      });

  @override
  Future<void> verifyOtp({
    required String phone,
    required String otp,
    required int otpId,
  }) =>
      _guard(() => _api.post('/auth/verify-otp',
          body: {'phone': phone, 'otp': otp, 'otpId': otpId}, auth: false));

  @override
  Future<void> resendOtp({required String phone}) => _guard(
      () => _api.post('/auth/resend-otp', body: {'phone': phone}, auth: false));

  @override
  Future<void> forgotPassword({required String phone}) => _guard(() =>
      _api.post('/auth/forgot-password', body: {'phone': phone}, auth: false));

  @override
  Future<void> resetPassword({
    required String phone,
    required String otp,
    required String newPassword,
  }) =>
      _guard(() => _api.post('/auth/reset-password',
          body: {'phone': phone, 'otp': otp, 'newPassword': newPassword},
          auth: false));

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
```

`lib/features/auth/data/auth_providers.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_config.dart';
import '../../../core/api/api_providers.dart';
import 'auth_repository.dart';
import 'http_auth_repository.dart';
import 'mock_auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  if (useMocks) return MockAuthRepository();
  return HttpAuthRepository(
      ref.watch(apiClientProvider), ref.watch(tokenStoreProvider));
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `flutter test`
Expected: PASS. (Existing widget tests override `authRepositoryProvider`, so the HTTP default is not exercised.)

- [ ] **Step 5: Analyze and commit**

```bash
flutter analyze
git add lib test
git commit -m "feat(auth): HttpAuthRepository against the real API, mocks behind USE_MOCKS

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Auth screens and routes (sign-up to OTP, forgot/reset password)

**Files:**
- Create: `lib/features/auth/presentation/otp_screen.dart`, `forgot_password_screen.dart`, `reset_password_screen.dart`
- Modify: `lib/features/auth/presentation/login_screen.dart`, `signup_screen.dart`, `lib/core/router/app_router.dart`, `lib/core/router/auth_redirect.dart`
- Test: `test/features/auth/otp_flow_test.dart`, `test/core/router/auth_redirect_test.dart`

**Interfaces:**
- Consumes: `AuthController` methods and `OtpChallenge` (Task 5), `AuthFormState`, `AuthScaffold`, `FormError`, `PrimaryButton` (existing), `validateOtp`, `validateNewPassword`, `validatePhone`, `validateConfirm`.
- Produces: routes `/verify-otp?phone=<p>&otpId=<n>`, `/forgot-password`, `/reset-password?phone=<p>`; all are public (no sign-in needed). Widget keys: `otp`, `otp-submit`, `otp-resend`, `forgot-phone`, `forgot-submit`, `reset-otp`, `reset-password`, `reset-confirm`, `reset-submit`, `go-forgot`.

- [ ] **Step 1: Write the failing tests**

Extend `test/core/router/auth_redirect_test.dart` with:

```dart
  test('verify-otp, forgot-password and reset-password are public', () {
    for (final p in ['/verify-otp', '/forgot-password', '/reset-password']) {
      expect(authRedirect(location: p, auth: const AsyncData<Driver?>(null)), isNull,
          reason: p);
    }
  });
```

Create `test/features/auth/otp_flow_test.dart`:

```dart
import 'package:driver_app/app.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget buildApp() => ProviderScope(
      overrides: [
        authRepositoryProvider
            .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    );

Future<void> openSignUp(WidgetTester tester) async {
  await tester.pumpWidget(buildApp());
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('go-signup')));
  await tester.pumpAndSettle();
}

Future<void> fillSignUp(WidgetTester tester, {String password = 'Secret1!'}) async {
  await tester.enterText(find.byKey(const Key('firstName')), 'Kasun');
  await tester.enterText(find.byKey(const Key('lastName')), 'Perera');
  await tester.enterText(find.byKey(const Key('phone')), '077 111 1111');
  await tester.enterText(find.byKey(const Key('password')), password);
  await tester.enterText(find.byKey(const Key('confirm')), password);
  await tester.tap(find.byKey(const Key('signup-submit')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('sign-up leads to the OTP screen, then back to sign in', (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester);
    expect(find.byKey(const Key('otp')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('otp')), '123456');
    await tester.tap(find.byKey(const Key('otp-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(find.text('Phone verified. Sign in to continue.'), findsOneWidget);
  });

  testWidgets('a wrong OTP shows the error and stays', (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester);
    await tester.enterText(find.byKey(const Key('otp')), '000000');
    await tester.tap(find.byKey(const Key('otp-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Invalid or expired code'), findsOneWidget);
    expect(find.byKey(const Key('otp')), findsOneWidget);
  });

  testWidgets('a weak sign-up password is rejected before any request', (tester) async {
    await openSignUp(tester);
    await fillSignUp(tester, password: 'secret1');
    expect(find.text('Use 6+ characters with an uppercase letter and a special character'),
        findsOneWidget);
    expect(find.byKey(const Key('otp')), findsNothing);
  });

  testWidgets('forgot then reset password returns to sign in', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('go-forgot')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('forgot-phone')), '0771111111');
    await tester.tap(find.byKey(const Key('forgot-submit')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('reset-otp')), '123456');
    await tester.enterText(find.byKey(const Key('reset-password')), 'Newpass1!');
    await tester.enterText(find.byKey(const Key('reset-confirm')), 'Newpass1!');
    await tester.tap(find.byKey(const Key('reset-submit')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(find.text('Password updated. Sign in with your new password.'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `flutter test test/features/auth/otp_flow_test.dart test/core/router/auth_redirect_test.dart`
Expected: FAIL (keys/screens/routes missing).

- [ ] **Step 3: Implement**

`lib/core/router/auth_redirect.dart`: change the first line of the set to
`const _publicRoutes = {'/splash', '/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password'};`
and leave the logic unchanged (a signed-in user is still sent away only from `/login` and `/signup`).

`lib/core/router/app_router.dart`: add imports for the three new screens and, beside the other public routes:

```dart
      GoRoute(
        path: '/verify-otp',
        builder: (_, state) => OtpScreen(
          phone: state.uri.queryParameters['phone'] ?? '',
          otpId: int.tryParse(state.uri.queryParameters['otpId'] ?? '') ?? 0,
        ),
      ),
      GoRoute(
          path: '/forgot-password',
          builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) => ResetPasswordScreen(
            phone: state.uri.queryParameters['phone'] ?? ''),
      ),
```

Banner messages after success travel as a `message` query parameter on `/login` (`/login?message=...`); `LoginScreen` gets `final String? notice` and the route builds it from `state.uri.queryParameters['message']`. Change the `/login` route to `builder: (_, state) => LoginScreen(notice: state.uri.queryParameters['message'])`. In `LoginScreen`, add `const LoginScreen({super.key, this.notice});`, show `if (widget.notice != null) Text(widget.notice!, key: const Key('login-notice'))` above the form, add a `TextButton(key: const Key('go-forgot'), onPressed: () => context.go('/forgot-password'), child: const Text('Forgot password?'))` under the sign-in button.

`signup_screen.dart` submit: after `signUp(...)` returns `challenge`, navigate:

```dart
          onPressed: () => submit(() async {
            final challenge = await ref
                .read(authControllerProvider.notifier)
                .signUp(
                    firstName: _firstName.text.trim(),
                    lastName: _lastName.text.trim(),
                    phone: _phone.text.trim(),
                    password: _password.text);
            if (!mounted) return;
            context.go(Uri(path: '/verify-otp', queryParameters: {
              'phone': challenge.phone,
              'otpId': '${challenge.otpId}',
            }).toString());
          }),
```

`lib/features/auth/presentation/otp_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone, required this.otpId});

  final String phone;
  final int otpId;

  @override
  AuthFormState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends AuthFormState<OtpScreen> {
  final _otp = TextEditingController();

  @override
  void dispose() {
    _otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Verify your phone',
      subtitle: 'Enter the 6-digit code sent to ${widget.phone}.',
      children: [
        Form(
          key: formKey,
          child: TextFormField(
            key: const Key('otp'),
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Code'),
            validator: validateOtp,
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('otp-submit'),
          label: 'Verify',
          isLoading: busy,
          onPressed: () => submit(() async {
            await ref.read(authControllerProvider.notifier).verifyOtp(
                phone: widget.phone,
                otp: _otp.text.trim(),
                otpId: widget.otpId);
            if (!mounted) return;
            context.go(Uri(path: '/login', queryParameters: {
              'message': 'Phone verified. Sign in to continue.'
            }).toString());
          }),
        ),
        const SizedBox(height: 12),
        TextButton(
          key: const Key('otp-resend'),
          onPressed: () => submit(() => ref
              .read(authControllerProvider.notifier)
              .resendOtp(phone: widget.phone)),
          child: const Text('Resend code'),
        ),
      ],
    );
  }
}
```

Note: `submit` validates the form first; "Resend code" with an empty field would fail validation. Give resend its own guard instead of `submit`: replace its `onPressed` with
`() async { try { await ref.read(authControllerProvider.notifier).resendOtp(phone: widget.phone); } on AuthException catch (e) { if (mounted) setState(() => error = e.message); } }`
and import `../data/auth_repository.dart`.

`lib/features/auth/presentation/forgot_password_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  AuthFormState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends AuthFormState<ForgotPasswordScreen> {
  final _phone = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Forgot password',
      subtitle: "We'll text you a code to reset it.",
      children: [
        Form(
          key: formKey,
          child: TextFormField(
            key: const Key('forgot-phone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone number'),
            validator: validatePhone,
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('forgot-submit'),
          label: 'Send code',
          isLoading: busy,
          onPressed: () => submit(() async {
            final phone = _phone.text.trim();
            await ref
                .read(authControllerProvider.notifier)
                .forgotPassword(phone: phone);
            if (!mounted) return;
            context.go(Uri(
                path: '/reset-password',
                queryParameters: {'phone': phone}).toString());
          }),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.go('/login'),
          child: const Text('Back to sign in'),
        ),
      ],
    );
  }
}
```

`lib/features/auth/presentation/reset_password_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/primary_button.dart';
import 'auth_controller.dart';
import 'auth_form_state.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.phone});

  final String phone;

  @override
  AuthFormState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends AuthFormState<ResetPasswordScreen> {
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _otp.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Reset password',
      subtitle: 'Enter the code sent to ${widget.phone} and choose a new password.',
      children: [
        Form(
          key: formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('reset-otp'),
                controller: _otp,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(labelText: 'Code'),
                validator: validateOtp,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('reset-password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password'),
                validator: validateNewPassword,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('reset-confirm'),
                controller: _confirm,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm new password'),
                validator: (v) => validateConfirm(v, _password.text),
              ),
            ],
          ),
        ),
        FormError(error),
        const SizedBox(height: 24),
        PrimaryButton(
          key: const Key('reset-submit'),
          label: 'Update password',
          isLoading: busy,
          onPressed: () => submit(() async {
            await ref.read(authControllerProvider.notifier).resetPassword(
                phone: widget.phone,
                otp: _otp.text.trim(),
                newPassword: _password.text);
            if (!mounted) return;
            context.go(Uri(path: '/login', queryParameters: {
              'message': 'Password updated. Sign in with your new password.'
            }).toString());
          }),
        ),
      ],
    );
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `flutter test`
Expected: PASS.

- [ ] **Step 5: Analyze and commit**

```bash
flutter analyze
git add lib test
git commit -m "feat(auth): OTP verification, forgot and reset password screens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Verify stage 1 on the emulator against the local API

**Files:** none (add a note to `docs/superpowers/plans/` only if something differs from the plan).

**Interfaces:**
- Consumes: running local API (Task 2), emulator `emulator-5554` (`flutter emulators --launch pixel7pro_test` if it is not running), everything above.

- [ ] **Step 1: Confirm the API is up and the emulator is online**

```bash
curl -s http://localhost:5000/api/health
flutter devices
```
Expected: health ok; `emulator-5554` listed.

- [ ] **Step 2: Run the app against the local API**

```bash
cd /c/Users/sulit/Documents/Way/Dracarys_Waypoint/mobile/driver_app
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```
Run in the background so hot reload stays available. Expected: the app launches to the sign-in screen.

- [ ] **Step 3: Drive the flows and look at each screen**

Take an emulator screenshot (`adb exec-out screencap -p`, adb is under the Android SDK `platform-tools`) after each step and look at it:
1. Sign in with phone `0770000002`, password `111111`. Expected: lands on My Trips; Account shows the driver's real name/code/depot from `/auth/me`.
2. Kill and relaunch the app. Expected: still signed in (token persisted).
3. Sign out, then sign in with a wrong password. Expected: the API's "Invalid phone number or password" inline.
4. Stop the API (`Ctrl+C` / kill the node process) and try signing in. Expected: "Can't reach the server. Check your connection." Restart the API.
5. Sign up a new driver (`Kasun`, `Perera`, an unused phone like `0771234567`, `Secret1!`). Expected: OTP screen. In dev the register response may include the code in `data` (see `otpForTesting` in `api/src/modules/auth/auth.service.ts`); read it from the API log or call `POST /auth/register` with curl to see its field name. Enter it, expect the sign-in screen with "Phone verified. Sign in to continue." Signing in works but the driver has no trips or vehicle yet.
6. "Forgot password" for the **sign-up driver from step 5** (not the demo driver, whose `111111` password cannot be restored because it fails the new-password rule). Reset with the dev code from the response, then sign in with the new password.

- [ ] **Step 4: Record outcomes and clean up**

If any step fails, fix the cause (do not skip) and re-run the failing step. Then:

```bash
flutter analyze
flutter test
git status --short
```
Expected: clean analyze, all tests pass, working tree clean apart from `android/build/`. Report to the user: what was verified with screenshots, anything that behaved differently from the README, and that stages 2-4 each need their own plan.

If `/run-skill-generator` is worth recommending (Docker install, `.env` setup and `--dart-define` were needed), say so in the report.
