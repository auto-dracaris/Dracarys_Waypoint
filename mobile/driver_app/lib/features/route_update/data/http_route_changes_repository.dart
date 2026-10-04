import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/format.dart';
import '../../../core/storage/offline_cache.dart';
import '../../../core/uuid.dart';
import '../../sync/data/action_queue.dart';
import '../../sync/data/action_submitter.dart';
import '../../sync/domain/pending_action.dart';
import '../domain/route_change.dart';
import 'route_changes_repository.dart';

StopMovement _movement(Object? v) => switch (v) {
  'up' => StopMovement.up,
  'down' => StopMovement.down,
  _ => StopMovement.none,
};

List<SequenceStop> _sequence(Object? list) => [
  for (final s in (list as List? ?? const []).cast<Map<String, dynamic>>())
    SequenceStop(
      name: s['name'] as String,
      area: s['area'] as String?,
      completed: s['completed'] == true,
      movement: _movement(s['movement']),
    ),
];

String _clock(Object? iso) {
  final t = iso is String ? DateTime.tryParse(iso) : null;
  return t == null ? '—' : formatTime(t.toLocal());
}

/// Maps `GET /trips/:id/route-change` (and the acknowledge reply).
RouteChange routeChangeFromJson(Map<String, dynamic> j) => RouteChange(
  tripId: j['tripId'] as String,
  planVersion: (j['planVersion'] as num).toInt(),
  updatedAt: DateTime.parse(j['updatedAt'] as String).toLocal(),
  reason: (j['reason'] as String?) ?? '',
  previous: _sequence(j['previous']),
  updated: _sequence(j['updated']),
  impactStopName: (j['impactStopName'] as String?) ?? '',
  impactArrivalNow: _clock(j['impactArrivalNow']),
  impactArrivalWas: _clock(j['impactArrivalWas']),
  tightWindow: j['tightWindow'] as String?,
  acknowledged: j['acknowledged'] == true,
);

/// Route changes from the API. The last one read is kept for offline, and an
/// acknowledgement made without a connection is queued and already counts as
/// acknowledged on the phone.
class HttpRouteChangesRepository implements RouteChangesRepository {
  HttpRouteChangesRepository(
    this._api, {
    required OfflineCache cache,
    required ActionSubmitter submitter,
    required ActionQueue queue,
  }) : _cache = cache,
       _submitter = submitter,
       _queue = queue;

  final ApiClient _api;
  final OfflineCache _cache;
  final ActionSubmitter _submitter;
  final ActionQueue _queue;

  Future<bool> _ackQueued(String tripId) async => (await _queue.all()).any(
    (a) => a.tripId == tripId && a.kind == ActionKind.ackRoute && a.isPending,
  );

  @override
  Future<RouteChange?> get(String tripId) async {
    Object? data;
    try {
      data = await _api.get('/trips/$tripId/route-change');
      await _cache.putJson('route:$tripId', data);
    } on ApiException catch (e) {
      if (!e.isNetwork) rethrow;
      data = await _cache.getJson('route:$tripId');
    }
    if (data is! Map<String, dynamic>) return null;
    final change = routeChangeFromJson(data);
    return await _ackQueued(tripId)
        ? change.copyWith(acknowledged: true)
        : change;
  }

  @override
  Future<RouteChange> acknowledge(String tripId) async {
    try {
      final current = await get(tripId);
      if (current == null) throw StateError('No route change for $tripId');
      await _submitter.submit(
        kind: ActionKind.ackRoute,
        tripId: tripId,
        body: {'clientId': newUuid()},
      );
      return current.copyWith(acknowledged: true);
    } on ApiException catch (e) {
      if (e.statusCode == 404) throw StateError('No route change for $tripId');
      rethrow;
    }
  }
}
