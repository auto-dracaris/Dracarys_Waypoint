import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether the phone has a network at all, as the system reports it. A
/// network is not the same as reaching the server (a wifi with no internet), so
/// this is only one of the signals feeding [onlineProvider].
final networkStatusProvider = Provider<Stream<bool>>((_) async* {
  final connectivity = Connectivity();
  bool up(List<ConnectivityResult> r) =>
      r.isNotEmpty && !r.contains(ConnectivityResult.none);
  try {
    yield up(await connectivity.checkConnectivity());
    yield* connectivity.onConnectivityChanged.map(up);
  } catch (_) {
    // No plugin (tests, unsupported platform): the other signals still work.
  }
});

/// Whether the app can reach the server right now.
///
/// It goes offline when the system says there is no network, or when a request
/// fails to get through, and comes back when the network returns or a request
/// succeeds. Long-pressing the status pill forces offline for demos; that
/// holds until it is long-pressed again.
class OnlineNotifier extends Notifier<bool> {
  bool _forcedOffline = false;

  @override
  bool build() {
    final sub = ref
        .watch(networkStatusProvider)
        .listen((up) => report(up), onError: (_) {});
    ref.onDispose(sub.cancel);
    return true;
  }

  /// A network or request outcome: [reachable] false means a call just failed
  /// to get through, true that one did (or the network came back).
  void report(bool reachable) {
    if (_forcedOffline) return;
    if (state != reachable) state = reachable;
  }

  /// Demo switch behind the status pill's long-press.
  void toggle() {
    if (kReleaseMode) return; // a demo tool, not for real drivers
    _forcedOffline = !_forcedOffline;
    state = !_forcedOffline;
  }
}

final onlineProvider = NotifierProvider<OnlineNotifier, bool>(
  OnlineNotifier.new,
);
