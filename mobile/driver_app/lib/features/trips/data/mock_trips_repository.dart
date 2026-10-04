import '../domain/order.dart';
import '../domain/shortfall_report.dart';
import '../domain/stop.dart';
import '../domain/stop_gate.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'trips_repository.dart';

class MockTripsRepository implements TripsRepository {
  MockTripsRepository({
    this.latency = const Duration(milliseconds: 400),
    DateTime? today,
    DateTime Function()? now,

    /// Start with trip 1 already on the road (loaded and started), for tests and
    /// demos that begin at a stop. Otherwise it is still being loaded.
    bool onTheRoad = false,
  }) : _now = now ?? DateTime.now {
    final base = today ?? DateTime.now();
    _today = DateTime(base.year, base.month, base.day);
    _trips = _seed(_today, _now(), onTheRoad: onTheRoad);
  }

  final Duration latency;
  final DateTime Function() _now;
  late List<Trip> _trips;
  late final DateTime _today;

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Future<void> _wait() => Future<void>.delayed(latency);

  @override
  bool get usesCodes => false;

  @override
  Future<Vehicle> getVehicle() async {
    await _wait();
    return const Vehicle(plate: 'VEH021', type: 'Refrigerated van');
  }

  @override
  Future<List<Trip>> getTrips({DateTime? date}) async {
    await _wait();
    if (date != null && !_sameDay(date, _today)) return const [];
    return List.unmodifiable(_trips);
  }

  @override
  Future<Trip> getTrip(String id) async {
    await _wait();
    return _trips[_indexOf(id)];
  }

  @override
  Future<Trip> simulateLoadingComplete(String tripId) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    if (trip.status != TripStatus.loading) return trip;
    return _store(i, trip.copyWith(status: TripStatus.ready));
  }

  @override
  Future<Trip> startTrip(String tripId, {String? otp}) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    if (trip.status == TripStatus.inProgress ||
        trip.status == TripStatus.completed) {
      return trip;
    }
    // The server only starts a trip that has been loaded.
    if (trip.status != TripStatus.ready) {
      throw StateError(
        'The vehicle is not loaded yet. Wait for the loading team to finish.',
      );
    }
    return _store(i, trip.copyWith(status: TripStatus.inProgress));
  }

  @override
  Future<Trip> markArrived(String tripId, {String? stopId}) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    final target = stopToArriveAt(trip, stopId: stopId);
    if (target == null) return trip;

    return _store(
      i,
      _replaceStop(
        trip,
        target.copyWith(status: StopStatus.arrived, arrivedAt: _now()),
      ),
    );
  }

  @override
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  }) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    final stop = stopToComplete(trip, stopId);
    if (stop == null) return trip;

    final delivered = stop.copyWith(
      status: StopStatus.completed,
      orders: [
        for (final o in stop.orders)
          o.copyWith(
            status: OrderStatus.delivered,
            deliveredCases: deliveredCases[o.id] ?? o.cases,
          ),
      ],
    );
    var updated = _replaceStop(trip, delivered);
    if (updated.activeStop == null) {
      updated = updated.copyWith(status: TripStatus.completed);
    }
    return _store(i, updated);
  }

  Trip _replaceStop(Trip trip, Stop replacement) => trip.copyWith(
    stops: [
      for (final s in trip.stops) s.id == replacement.id ? replacement : s,
    ],
  );

  Trip _store(int index, Trip trip) {
    _trips = [..._trips]..[index] = trip;
    return trip;
  }

  int _indexOf(String id) {
    final i = _trips.indexWhere((t) => t.id == id);
    if (i == -1) throw StateError('Trip not found: $id');
    return i;
  }

  static List<Trip> _seed(
    DateTime day,
    DateTime now, {
    bool onTheRoad = false,
  }) {
    DateTime at(int h, int m) => DateTime(day.year, day.month, day.day, h, m);

    Order order(
      String id,
      String store,
      int cases,
      Temperature t, {
      String? handling,
    }) => Order(
      id: id,
      storeName: store,
      cases: cases,
      temperature: t,
      handling: handling,
    );

    Stop stop(
      String tripId,
      int seq,
      String name,
      String window,
      DateTime eta,
      double lat,
      double lng,
      List<Order> orders, {
      String dock = 'Rear loading dock',
      int etaMinutes = 15,
      double distanceKm = 5,
      StopStatus status = StopStatus.pending,
    }) => Stop(
      id: '$tripId-stop-$seq',
      sequence: seq,
      name: name,
      deliveryWindow: window,
      plannedArrival: eta,
      dock: dock,
      lat: lat,
      lng: lng,
      orders: orders,
      contactPhone: '+94 11 234 5678',
      etaMinutes: etaMinutes,
      distanceKm: distanceKm,
      status: status,
    );

    const chilled = Temperature.chilled;
    const ambient = Temperature.ambient;
    const t1 = 'trip-1';
    const t2 = 'trip-2';

    return [
      Trip(
        id: t1,
        name: 'Trip 1',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(5, 30),
        status: onTheRoad ? TripStatus.inProgress : TripStatus.loading,
        planVersion: 3,
        updatedAt: now.subtract(const Duration(minutes: 2)),
        shortfall: const ShortfallReport(
          orderId: 'ORD-4521',
          storeName: 'Waypoint Fresh — Ja-Ela',
          shortCases: 2,
          plannedCases: 12,
          dispatcherNote: 'Proceed with partial load.',
        ),
        stops: [
          stop(
            t1,
            1,
            'Cargills Food City — Kadawatha',
            '05:45-07:00',
            at(5, 50),
            7.0011,
            79.9503,
            [
              order('ORD-4511', 'Cargills Food City — Kadawatha', 10, chilled),
              order('ORD-4512', 'Cargills Food City — Kadawatha', 6, ambient),
              order('ORD-4513', 'Cargills Food City — Kadawatha', 4, ambient),
            ],
            dock: 'Front receiving bay',
            etaMinutes: 15,
            distanceKm: 6.1,
            status: StopStatus.completed,
          ),
          stop(
            t1,
            2,
            'Keells Super — Kiribathgoda',
            '06:00-07:30',
            at(6, 25),
            6.9805,
            79.9243,
            [
              order('ORD-4516', 'Keells Super — Kiribathgoda', 8, ambient),
              order('ORD-4517', 'Keells Super — Kiribathgoda', 5, ambient),
            ],
            dock: 'Side entrance',
            etaMinutes: 10,
            distanceKm: 3.4,
            status: StopStatus.completed,
          ),
          stop(
            t1,
            3,
            'Waypoint Fresh — Ja-Ela',
            '06:00-08:00',
            at(7, 10),
            7.0744,
            79.8919,
            [
              order(
                'ORD-4521',
                'Waypoint Fresh — Ja-Ela',
                12,
                chilled,
                handling: 'Keep cold chain intact.',
              ),
              order('ORD-4522', 'Waypoint Fresh — Ja-Ela', 8, ambient),
            ],
            etaMinutes: 18,
            distanceKm: 7.2,
          ),
          stop(
            t1,
            4,
            'Lanka Sathosa — Ragama',
            '07:00-09:00',
            at(7, 45),
            7.0299,
            79.9226,
            [order('ORD-4530', 'Lanka Sathosa — Ragama', 6, ambient)],
            dock: 'Check receiving entrance',
            etaMinutes: 12,
            distanceKm: 4.5,
          ),
        ],
      ),
      Trip(
        id: t2,
        name: 'Trip 2',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(7, 0),
        status: TripStatus.loading,
        stops: [
          stop(
            t2,
            1,
            'Waypoint Fresh — Minuwangoda',
            '08:00-10:00',
            at(8, 30),
            7.1730,
            79.9530,
            [order('ORD-4601', 'Waypoint Fresh — Minuwangoda', 9, ambient)],
          ),
          stop(
            t2,
            2,
            'Waypoint Fresh — Veyangoda',
            '09:00-11:00',
            at(9, 30),
            7.1600,
            80.0980,
            [order('ORD-4602', 'Waypoint Fresh — Veyangoda', 7, chilled)],
          ),
        ],
      ),
    ];
  }
}
