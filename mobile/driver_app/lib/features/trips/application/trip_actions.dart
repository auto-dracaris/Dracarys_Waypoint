import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/clock.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/photos/photo_picker.dart';
import '../../records/data/records_providers.dart';
import '../../records/domain/saved_record.dart';
import '../../notifications/data/notifications_providers.dart';
import '../../route_update/data/route_changes_providers.dart';
import '../../stops/data/stop_reports_providers.dart';
import '../../stops/data/stop_reports_repository.dart';
import '../data/trips_providers.dart';
import '../domain/stop.dart';

/// A delivery problem the driver filled in on the report form.
class IssueReport {
  const IssueReport({
    required this.clientId,
    required this.orderId,
    required this.type,
    required this.affectedCases,
    this.note,
    this.photo,
    this.photoId,
  });

  final String clientId;
  final String orderId;

  /// An API issue type, e.g. `damaged`.
  final String type;
  final int affectedCases;
  final String? note;
  final PickedPhoto? photo;
  final String? photoId;
}

/// Driver actions on a trip. Each one calls the repository, saves a record of
/// what happened (waiting to sync while offline) and refreshes the providers
/// screens watch, so the UI never shows stale progress.
class TripActions {
  TripActions(this._ref);

  final Ref _ref;

  /// A 409 means the trip moved on under the driver (the dispatcher reordered
  /// the stops, the loader changed its state). Reload what the screens show so
  /// they catch up, then let the caller report the problem.
  Future<T> _guard<T>(String tripId, Future<T> Function() run) async {
    try {
      return await run();
    } on ApiException catch (e) {
      if (e.statusCode == 409) _refresh(tripId);
      rethrow;
    }
  }

  /// Demo hook standing in for the loading team finishing the truck.
  Future<void> simulateLoadingComplete(String tripId) async {
    await _ref.read(tripsRepositoryProvider).simulateLoadingComplete(tripId);
    _refresh(tripId);
  }

  Future<void> acknowledgeRouteChange(String tripId) async {
    await _ref.read(routeChangesRepositoryProvider).acknowledge(tripId);
    _ref.invalidate(routeChangeProvider(tripId));
    _ref.invalidate(notificationsProvider);
  }

  /// [otp] is the six-digit start code from the loader (real API only).
  Future<void> startTrip(String tripId, {String? otp}) =>
      _guard(tripId, () async {
        await _ref.read(tripsRepositoryProvider).startTrip(tripId, otp: otp);
        _refresh(tripId);
      });

  Future<void> markArrived(String tripId, {String? stopId}) => _guard(
    tripId,
    () async {
      final repo = _ref.read(tripsRepositoryProvider);
      final trip = await repo.getTrip(tripId);
      final before = stopId == null
          ? trip.activeStop
          : trip.stops.where((s) => s.id == stopId).firstOrNull;
      await repo.markArrived(tripId, stopId: stopId);
      if (before != null && before.status == StopStatus.pending) {
        await _record(tripId, RecordKind.arrival, 'Arrival at ${before.name}');
      }
      _refresh(tripId);
    },
  );

  /// Who took the goods, with the signature or photo that proves it.
  Future<void> submitProof(
    String tripId,
    String stopId, {
    required ProofIds ids,
    required String receivedBy,
    String? notes,
    List<int>? signaturePng,
    PickedPhoto? photo,
  }) => _guard(tripId, () async {
    await _ref
        .read(stopReportsRepositoryProvider)
        .submitProof(
          tripId: tripId,
          stopId: stopId,
          ids: ids,
          receivedBy: receivedBy,
          notes: notes,
          signaturePng: signaturePng,
          photo: photo,
        );
    _ref.invalidate(recordsProvider(tripId));
  });

  Future<void> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  }) => _guard(tripId, () async {
    final repo = _ref.read(tripsRepositoryProvider);
    final before = await repo.getTrip(tripId);
    final stop = before.stops.where((s) => s.id == stopId).firstOrNull;
    await repo.completeStop(
      tripId,
      stopId,
      deliveredCases: deliveredCases,
      deliveryCode: deliveryCode,
    );
    if (stop != null && stop.status == StopStatus.arrived) {
      await _record(tripId, RecordKind.proof, 'Proof of delivery');
    }
    _refresh(tripId);
  });

  /// Sends [report] to the dispatcher when there is one; the record is saved
  /// either way so the offline trip shows it.
  Future<void> reportIssue(String tripId, {IssueReport? report}) =>
      _guard(tripId, () async {
        if (report != null) {
          await _ref
              .read(stopReportsRepositoryProvider)
              .reportIssue(
                tripId: tripId,
                clientId: report.clientId,
                orderId: report.orderId,
                type: report.type,
                affectedCases: report.affectedCases,
                note: report.note,
                photo: report.photo,
                photoId: report.photoId,
              );
        }
        await _record(tripId, RecordKind.issue, 'Delivery issue report');
        _refresh(tripId);
      });

  Future<void> _record(String tripId, RecordKind kind, String title) async {
    final now = _ref.read(clockProvider)();
    final online = _ref.read(onlineProvider);
    await _ref
        .read(recordsRepositoryProvider)
        .add(
          SavedRecord(
            id: '${kind.name}-${now.microsecondsSinceEpoch}',
            tripId: tripId,
            kind: kind,
            title: title,
            savedAt: now,
            syncState: online ? SyncState.synced : SyncState.waitingToSync,
          ),
        );
  }

  void _refresh(String tripId) {
    _ref.invalidate(tripsProvider);
    _ref.invalidate(tripProvider(tripId));
    _ref.invalidate(recordsProvider(tripId));
    _ref.invalidate(notificationsProvider);
  }
}

final tripActionsProvider = Provider<TripActions>(TripActions.new);
