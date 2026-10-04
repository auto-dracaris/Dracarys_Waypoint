import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/demo_mode.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../notifications/data/notifications_providers.dart';
import '../../records/data/records_providers.dart';
import '../../route_update/data/route_changes_providers.dart';
import '../../trips/data/trips_providers.dart';
import '../data/action_queue.dart';
import '../data/sync_providers.dart';
import '../domain/pending_action.dart';

class SyncState {
  const SyncState({
    this.pending = const [],
    this.rejected = const [],
    this.syncing = false,
  });

  final List<PendingAction> pending;
  final List<PendingAction> rejected;
  final bool syncing;

  bool get hasWork => pending.isNotEmpty;
  bool get isEmpty => pending.isEmpty && rejected.isEmpty;

  SyncState copyWith({
    List<PendingAction>? pending,
    List<PendingAction>? rejected,
    bool? syncing,
  }) => SyncState(
    pending: pending ?? this.pending,
    rejected: rejected ?? this.rejected,
    syncing: syncing ?? this.syncing,
  );
}

/// Sends the queued actions when the connection allows, in the order they were
/// made, and keeps the app informed of what is still waiting.
///
/// It tries again when the network returns, when the app comes back to the
/// foreground, and on a timer while anything is waiting or the server cannot
/// be reached (the timer's call doubles as the "is it back?" check).
class SyncService extends Notifier<SyncState> {
  bool _running = false;
  Timer? _timer;
  StreamSubscription<void>? _changes;

  static const retryEvery = Duration(seconds: 20);

  ActionQueue get _queue => ref.read(actionQueueProvider);

  @override
  SyncState build() {
    ref.listen(onlineProvider, (was, online) {
      if (online && was == false) kick();
    });
    // A different driver (or none) means the queue on disk is not theirs to
    // send; the screens read the state, so refresh it with the sign-in.
    ref.listen(authControllerProvider, (_, _) => _refreshState());

    _changes = _queue.changes.listen((_) => _refreshState());
    _timer = Timer.periodic(retryEvery, (_) => _tick());
    ref.onDispose(() {
      _timer?.cancel();
      _changes?.cancel();
    });
    _refreshState();
    return const SyncState();
  }

  Future<void> _refreshState() async {
    try {
      final all = await _queue.all();
      state = state.copyWith(
        pending: [
          for (final a in all)
            if (a.isPending) a,
        ],
        rejected: [
          for (final a in all)
            if (!a.isPending) a,
        ],
      );
    } catch (_) {
      // Storage unavailable (or the service was disposed mid-read): leave the
      // last known state.
    }
  }

  void _tick() {
    if (state.hasWork || !ref.read(onlineProvider)) kick();
  }

  /// Try to send what is waiting; safe to call at any time.
  void kick() => unawaited(sync().catchError((Object _) {}));

  Future<void> sync() async {
    if (_running) return;
    // Nobody to send as: the actions wait for the next sign-in.
    if (ref.read(authControllerProvider).value == null) return;
    if (ref.read(demoModeProvider)) return; // demo data has nothing to send
    _running = true;
    state = state.copyWith(syncing: true);
    var changed = false;
    final touchedTrips = <String>{};
    try {
      final blocked = <String>{};
      for (final a in (await _queue.all()).where((a) => a.isPending)) {
        final stopKey = '${a.tripId}:${a.stopId}';
        if (a.kind.isStopStep && blocked.contains(stopKey)) {
          await _queue.update(
            a.copyWith(
              state: ActionState.rejected,
              error: 'Not sent: an earlier step at this stop was refused.',
            ),
          );
          changed = true;
          continue;
        }
        try {
          await ref.read(actionExecutorProvider).run(a);
          await _queue.remove(a.id);
          touchedTrips.add(a.tripId);
          changed = true;
        } on ApiException catch (e) {
          if (_isTransient(e)) {
            // Still no signal, or the server is busy: keep everything, in
            // order, for the next attempt.
            await _queue.update(a.copyWith(attempts: a.attempts + 1));
            break;
          }
          await _queue.update(
            a.copyWith(state: ActionState.rejected, error: e.message),
          );
          touchedTrips.add(a.tripId);
          changed = true;
          if (a.kind.isStopStep) blocked.add(stopKey);
        } on StateError catch (e) {
          await _queue.update(
            a.copyWith(state: ActionState.rejected, error: e.message),
          );
          changed = true;
          if (a.kind.isStopStep) blocked.add(stopKey);
        }
      }
    } finally {
      _running = false;
      await _refreshState();
      state = state.copyWith(syncing: false);
    }
    if (changed) _refreshData(touchedTrips);
  }

  bool _isTransient(ApiException e) =>
      e.isNetwork ||
      e.statusCode >= 500 ||
      e.statusCode == 429 ||
      e.statusCode == 401;

  /// What the screens show may have moved on: reload it.
  void _refreshData(Set<String> tripIds) {
    ref.invalidate(tripsProvider);
    ref.invalidate(notificationsProvider);
    for (final id in tripIds) {
      ref.invalidate(tripProvider(id));
      ref.invalidate(recordsProvider(id));
      ref.invalidate(routeChangeProvider(id));
    }
  }

  /// The driver has read why an action was refused and dismisses it.
  Future<void> dismiss(String id) async {
    await _queue.remove(id);
    final tripIds = {
      for (final a in state.rejected)
        if (a.id == id) a.tripId,
    };
    _refreshData(tripIds);
  }
}

final syncServiceProvider = NotifierProvider<SyncService, SyncState>(
  SyncService.new,
);
