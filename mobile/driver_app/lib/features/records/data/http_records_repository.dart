import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/storage/offline_cache.dart';
import '../../sync/data/action_queue.dart';
import '../../sync/domain/pending_action.dart';
import '../domain/saved_record.dart';
import 'records_repository.dart';

RecordKind _kind(Object? v) => switch (v) {
  'issue' => RecordKind.issue,
  'proof' => RecordKind.proof,
  _ => RecordKind.arrival,
};

SavedRecord _fromJson(Map<String, dynamic> r, String tripId) => SavedRecord(
  id: r['id'] as String,
  tripId: tripId,
  kind: _kind(r['kind']),
  title: r['title'] as String,
  savedAt: DateTime.parse(r['savedAt'] as String).toLocal(),
  syncState: r['syncState'] == 'waiting'
      ? SyncState.waitingToSync
      : SyncState.synced,
);

/// A trip's records: what the server holds (`GET /trips/:id/records`, kept for
/// offline) plus the actions still waiting on the phone, marked "waiting to
/// sync". Arrivals, proofs and issues are created by the calls that perform
/// them, so there is nothing to add from here.
class HttpRecordsRepository implements RecordsRepository {
  HttpRecordsRepository(
    this._api, {
    required OfflineCache cache,
    required ActionQueue queue,
  }) : _cache = cache,
       _queue = queue;

  final ApiClient _api;
  final OfflineCache _cache;
  final ActionQueue _queue;

  @override
  Future<void> add(SavedRecord record) async {}

  Future<List<SavedRecord>> _server(String tripId) async {
    Object? data;
    try {
      data = await _api.get('/trips/$tripId/records', query: {'limit': '100'});
      await _cache.putJson('records:$tripId', data);
    } on ApiException catch (e) {
      if (!e.isNetwork) rethrow;
      data = await _cache.getJson('records:$tripId');
    }
    if (data is! Map) return const [];
    return [
      for (final r in (data['items'] as List).cast<Map<String, dynamic>>())
        _fromJson(r, tripId),
    ];
  }

  SavedRecord? _pending(PendingAction a) {
    final stop = a.meta['stopName'];
    final (kind, title) = switch (a.kind) {
      ActionKind.arrive => (
        RecordKind.arrival,
        stop == null ? 'Arrival' : 'Arrived at $stop',
      ),
      ActionKind.proof => (RecordKind.proof, 'Proof of delivery'),
      ActionKind.issue => (RecordKind.issue, 'Delivery issue report'),
      // Completing a stop and acknowledging a route are not records.
      ActionKind.complete || ActionKind.ackRoute => (null, ''),
    };
    if (kind == null) return null;
    return SavedRecord(
      id: 'pending-${a.id}',
      tripId: a.tripId,
      kind: kind,
      title: title,
      savedAt: a.createdAt,
      syncState: SyncState.waitingToSync,
    );
  }

  @override
  Future<List<SavedRecord>> list(String tripId) async {
    final waiting = [
      for (final a in await _queue.all())
        if (a.tripId == tripId && a.isPending) ?_pending(a),
    ];
    return [...waiting, ...await _server(tripId)]
      ..sort((a, b) => b.savedAt.compareTo(a.savedAt));
  }
}
