import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/demo_mode.dart';
import '../../../core/router/app_router.dart';
import '../../../core/router/routes.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/notifications_providers.dart';

/// What a push tap should open. `route_changed` needs the driver to review the
/// new order of stops; a trip push opens that trip; anything else opens the
/// Updates tab.
String pushDestination(Map<String, dynamic> data) {
  final tripId = data['tripId'] == null ? null : '${data['tripId']}';
  switch (data['type']) {
    case 'route_changed':
      return tripId == null ? '/updates' : AppRoutes.routeUpdate(tripId);
    case 'trip_assigned':
    case 'trip_ready':
      return tripId == null ? '/updates' : AppRoutes.trip(tripId);
    default:
      return '/updates';
  }
}

/// Tells the server which phone belongs to the signed-in driver, and removes it
/// at sign-out. Every call is safe without Firebase (tests, unsupported
/// platforms): it simply does nothing.
class PushRegistrar {
  PushRegistrar(this._ref);

  final Ref _ref;
  String? _token;

  bool get _available => Firebase.apps.isNotEmpty;

  Future<void> register() async {
    if (!_available) return;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      final token = await messaging.getToken();
      if (token == null) return;
      _token = token;
      await _send(token);
    } catch (_) {
      // No permission, no Play services, no connection: the notifications list
      // still works, and this runs again at the next start.
    }
  }

  Future<void> _send(String token) async {
    try {
      await _ref
          .read(apiClientProvider)
          .post(
            '/devices',
            body: {
              'token': token,
              'platform': Platform.isIOS ? 'ios' : 'android',
            },
          );
    } on ApiException {
      // Retried at the next start or token refresh.
    }
  }

  /// Call before logging out, while the access token still works.
  Future<void> unregister() async {
    if (!_available) return;
    try {
      final token = _token ?? await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _ref
          .read(apiClientProvider)
          .delete('/devices/${Uri.encodeComponent(token)}');
      _token = null;
    } catch (_) {
      // Signing out must work offline; the server drops dead tokens itself.
    }
  }
}

final pushRegistrarProvider = Provider<PushRegistrar>(PushRegistrar.new);

/// Keeps pushes wired up while a driver is signed in: registers the phone,
/// follows token changes, refreshes the list on a push, and opens the right
/// screen when one is tapped.
final pushLifecycleProvider = Provider<void>((ref) {
  final driverId = ref.watch(authControllerProvider.select((a) => a.value?.id));
  if (driverId == null ||
      ref.watch(demoModeProvider) ||
      Firebase.apps.isEmpty) {
    return;
  }

  final registrar = ref.read(pushRegistrarProvider);
  final subscriptions = <StreamSubscription<Object?>>[];

  void open(RemoteMessage m) =>
      ref.read(routerProvider).go(pushDestination(m.data));

  unawaited(registrar.register());
  final messaging = FirebaseMessaging.instance;
  subscriptions
    ..add(
      messaging.onTokenRefresh.listen((t) {
        registrar._token = t;
        unawaited(registrar._send(t));
      }),
    )
    // On screen the system shows nothing, so just refresh the list.
    ..add(
      FirebaseMessaging.onMessage.listen(
        (_) => ref.invalidate(notificationsProvider),
      ),
    )
    ..add(FirebaseMessaging.onMessageOpenedApp.listen(open));
  // A tap that launched the app from closed.
  unawaited(
    messaging.getInitialMessage().then((m) {
      if (m != null) open(m);
    }),
  );

  ref.onDispose(() {
    for (final s in subscriptions) {
      unawaited(s.cancel());
    }
  });
});
