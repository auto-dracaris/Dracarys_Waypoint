import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/storage/offline_cache.dart';
import '../../../core/uuid.dart';
import '../../auth/data/http_auth_repository.dart';
import '../../sync/data/action_queue.dart';
import '../../sync/data/action_submitter.dart';
import '../../sync/domain/pending_action.dart';
import '../../sync/domain/pending_overlay.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'trip_mapper.dart';
import 'trips_repository.dart';

String _day(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// The driver's trips from the Waypoint API.
///
/// Everything it reads is kept in the [OfflineCache], and when the server
/// cannot be reached the cached copy is returned instead. What the driver does
/// (arrive, complete) goes through the [ActionSubmitter]: sent at once when
/// there is a connection, saved to the queue when not. Either way the trip
/// that comes back has the unsent actions applied, so the screens show what
/// the driver has done.
///
/// Starting a trip is the one thing that needs the server: the start code is
/// checked there, and it is when the outlets' delivery codes are issued.
class HttpTripsRepository implements TripsRepository {
  HttpTripsRepository(
    this._api, {
    required OfflineCache cache,
    required ActionSubmitter submitter,
    required ActionQueue queue,
    DateTime Function()? now,
  }) : _cache = cache,
       _submitter = submitter,
       _queue = queue,
       _now = now ?? DateTime.now;

  final ApiClient _api;
  final OfflineCache _cache;
  final ActionSubmitter _submitter;
  final ActionQueue _queue;
  final DateTime Function() _now;

  @override
  bool get usesCodes => true;

  String get _stamp => _now().toUtc().toIso8601String();

  /// Runs [live]; if the server cannot be reached, answers from the cache
  /// instead, or rethrows when the cache has nothing.
  Future<T> _orCached<T>(
    Future<T> Function() live,
    Future<T?> Function() cached,
  ) async {
    try {
      return await live();
    } on ApiException catch (e) {
      if (!e.isNetwork) rethrow;
      final fallback = await cached();
      if (fallback == null) rethrow;
      return fallback;
    }
  }

  @override
  Future<Vehicle> getVehicle() async {
    final me = await _orCached<Map<String, dynamic>>(
      () async {
        final data = await _api.get('/auth/me') as Map<String, dynamic>;
        await _cache.putJson('me', data);
        return data;
      },
      () async {
        final c = await _cache.getJson('me');
        return c is Map ? Map<String, dynamic>.from(c) : null;
      },
    );
    final vehicle = driverFromJson(me).vehicle;
    return vehicle == null
        ? const Vehicle(plate: 'No vehicle', type: 'Not assigned yet')
        : Vehicle(plate: vehicle.plate, type: vehicle.type);
  }

  Future<Map<String, dynamic>> _tripJson(String id) => _orCached(
    () async {
      final json = await _api.get('/trips/$id') as Map<String, dynamic>;
      await _cache.putJson('trip:$id', json);
      return json;
    },
    () async {
      final c = await _cache.getJson('trip:$id');
      return c is Map ? Map<String, dynamic>.from(c) : null;
    },
  );

  Future<Trip> _withPending(Trip trip) async =>
      applyPending(trip, await _queue.all());

  @override
  Future<List<Trip>> getTrips({DateTime? date}) async {
    final day = _day(date ?? _now());
    final ids = await _orCached<List<String>>(
      () async {
        final data = await _api.get(
          '/trips',
          query: {'date': day, 'limit': '50'},
        ) as Map<String, dynamic>;
        final ids = [
          for (final item
              in (data['items'] as List).cast<Map<String, dynamic>>())
            item['id'] as String,
        ];
        await _cache.putJson('trips:$day', ids);
        return ids;
      },
      () async {
        final c = await _cache.getJson('trips:$day');
        return c is List ? c.cast<String>() : null;
      },
    );
    // The list leaves out each trip's stops; the cards show them.
    final trips = await Future.wait(ids.map(getTrip));
    return trips;
  }

  @override
  Future<Trip> getTrip(String id) async =>
      _withPending(tripFromJson(await _tripJson(id)));

  @override
  Future<Trip> simulateLoadingComplete(String tripId) => getTrip(tripId);

  @override
  Future<Trip> startTrip(String tripId, {String? otp}) async {
    final json = await _api.post(
      '/trips/$tripId/start',
      body: {'clientId': newUuid(), 'startedAt': _stamp, 'otp': otp},
    ) as Map<String, dynamic>;
    // The reply carries the delivery-code hashes: keep them for the road.
    await _cache.putJson('trip:$tripId', json);
    return _withPending(tripFromJson(json));
  }

  @override
  Future<Trip> markArrived(String tripId) async {
    final trip = await getTrip(tripId);
    final stop = trip.activeStop;
    if (stop == null || stop.status != StopStatus.pending) return trip;
    await _submitter.submit(
      kind: ActionKind.arrive,
      tripId: tripId,
      stopId: stop.id,
      body: {
        'clientId': newUuid(),
        'planVersion': trip.planVersion,
        'arrivedAt': _stamp,
      },
      meta: {'stopName': stop.name},
    );
    return getTrip(tripId);
  }

  @override
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  }) async {
    final trip = await getTrip(tripId);
    final stop = trip.stops.where((s) => s.id == stopId).firstOrNull;
    if (stop == null || stop.status != StopStatus.arrived) return trip;
    await _submitter.submit(
      kind: ActionKind.complete,
      tripId: tripId,
      stopId: stopId,
      body: {
        'clientId': newUuid(),
        'planVersion': trip.planVersion,
        'completedAt': _stamp,
        'deliveredCases': {
          for (final o in stop.orders) o.id: deliveredCases[o.id] ?? o.cases,
        },
        if (deliveryCode != null && deliveryCode.isNotEmpty)
          'deliveryCode': deliveryCode,
      },
      meta: {'stopName': stop.name},
    );
    return getTrip(tripId);
  }
}
