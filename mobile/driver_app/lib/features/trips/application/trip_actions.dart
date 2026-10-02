import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../records/data/records_providers.dart';
import '../../records/domain/saved_record.dart';
import '../data/trips_providers.dart';
import '../domain/stop.dart';

/// Driver actions on a trip. Each one calls the repository, saves a record of
/// what happened (waiting to sync while offline) and refreshes the providers
/// screens watch, so the UI never shows stale progress.
class TripActions {
  TripActions(this._ref);

  final Ref _ref;

  Future<void> startTrip(String tripId) async {
    await _ref.read(tripsRepositoryProvider).startTrip(tripId);
    _refresh(tripId);
  }

  Future<void> markArrived(String tripId) async {
    final repo = _ref.read(tripsRepositoryProvider);
    final before = (await repo.getTrip(tripId)).activeStop;
    await repo.markArrived(tripId);
    if (before != null && before.status == StopStatus.pending) {
      await _record(tripId, RecordKind.arrival, 'Arrival at ${before.name}');
    }
    _refresh(tripId);
  }

  Future<void> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
  }) async {
    final repo = _ref.read(tripsRepositoryProvider);
    final before = await repo.getTrip(tripId);
    final stop = before.stops.where((s) => s.id == stopId).firstOrNull;
    await repo.completeStop(tripId, stopId, deliveredCases: deliveredCases);
    if (stop != null && stop.status == StopStatus.arrived) {
      await _record(tripId, RecordKind.proof, 'Proof of delivery');
    }
    _refresh(tripId);
  }

  Future<void> reportIssue(String tripId) async {
    await _record(tripId, RecordKind.issue, 'Delivery issue report');
    _refresh(tripId);
  }

  Future<void> _record(String tripId, RecordKind kind, String title) async {
    final now = _ref.read(clockProvider)();
    final online = _ref.read(onlineProvider);
    await _ref.read(recordsRepositoryProvider).add(SavedRecord(
          id: '${kind.name}-${now.microsecondsSinceEpoch}',
          tripId: tripId,
          kind: kind,
          title: title,
          savedAt: now,
          syncState: online ? SyncState.synced : SyncState.waitingToSync,
        ));
  }

  void _refresh(String tripId) {
    _ref.invalidate(tripsProvider);
    _ref.invalidate(tripProvider(tripId));
    _ref.invalidate(recordsProvider(tripId));
  }
}

final tripActionsProvider = Provider<TripActions>(TripActions.new);
