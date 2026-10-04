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

    /// `colombo` tells the short central-Colombo loop instead of Gampaha.
    String area = '',
  }) : _now = now ?? DateTime.now {
    final base = today ?? DateTime.now();
    _today = DateTime(base.year, base.month, base.day);
    _trips = area == 'colombo'
        ? _seedColombo(_today, _now(), onTheRoad: onTheRoad)
        : _seed(_today, _now(), onTheRoad: onTheRoad);
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

  /// A short loop through central Colombo: depot at the Fort, then Pettah,
  /// Slave Island, Galle Face and back to the Fort, each leg about a kilometre
  /// so the whole drive fits on screen, among tall buildings for the 3D view.
  static List<Trip> _seedColombo(
    DateTime day,
    DateTime now, {
    bool onTheRoad = false,
  }) {
    Order order(String id, String store, int cases, Temperature t,
            {String? handling}) =>
        Order(
          id: id,
          storeName: store,
          cases: cases,
          temperature: t,
          handling: handling,
        );
    Stop stop(
      int seq,
      String name,
      String window,
      DateTime eta,
      double lat,
      double lng,
      List<Order> orders, {
      String dock = 'Rear loading dock',
      double distanceKm = 1,
    }) => Stop(
      id: 'trip-1-stop-$seq',
      sequence: seq,
      name: name,
      deliveryWindow: window,
      plannedArrival: eta,
      dock: dock,
      lat: lat,
      lng: lng,
      orders: orders,
      contactPhone: '+94 11 234 5678',
      etaMinutes: 6,
      distanceKm: distanceKm,
    );
    const chilled = Temperature.chilled;
    const ambient = Temperature.ambient;
    final base = DateTime(now.year, now.month, now.day, now.hour, now.minute);

    return [
      Trip(
        id: 'trip-1',
        name: 'Trip 1',
        subtitle: 'City deliveries · Colombo Fort',
        departure: base,
        // Already loaded: the demo starts at "Ready to depart".
        status: onTheRoad ? TripStatus.inProgress : TripStatus.ready,
        planVersion: 1,
        updatedAt: now.subtract(const Duration(minutes: 2)),
        stops: [
          stop(
            1,
            'Cargills Food City — Pettah',
            '09:00-11:00',
            base.add(const Duration(minutes: 8)),
            6.9385,
            79.8505,
            [
              order('ORD-5001', 'Cargills Food City — Pettah', 10, chilled),
              order('ORD-5002', 'Cargills Food City — Pettah', 6, ambient),
            ],
            dock: 'Front receiving bay',
            distanceKm: 0.9,
          ),
          stop(
            2,
            'Keells Super — Slave Island',
            '09:15-11:30',
            base.add(const Duration(minutes: 18)),
            6.9285,
            79.8525,
            [
              order('ORD-5011', 'Keells Super — Slave Island', 12, chilled,
                  handling: 'Keep cold chain intact.'),
              order('ORD-5012', 'Keells Super — Slave Island', 8, ambient),
            ],
            dock: 'Side entrance',
            distanceKm: 1.2,
          ),
          stop(
            3,
            'Arpico Super Centre — Galle Face',
            '09:30-12:00',
            base.add(const Duration(minutes: 28)),
            6.9272,
            79.8433,
            [order('ORD-5021', 'Arpico Super Centre — Galle Face', 9, ambient)],
            distanceKm: 0.9,
          ),
          stop(
            4,
            'Food Hall — World Trade Centre',
            '09:45-12:30',
            base.add(const Duration(minutes: 36)),
            6.9340,
            79.8420,
            [order('ORD-5031', 'Food Hall — World Trade Centre', 6, chilled)],
            dock: 'Basement loading bay',
            distanceKm: 0.8,
          ),
        ],
      ),
      // A later trip the loading team is still working on.
      Trip(
        id: 'trip-2',
        name: 'Trip 2',
        subtitle: 'City deliveries · Cinnamon Gardens',
        departure: base.add(const Duration(hours: 2)),
        status: TripStatus.loading,
        stops: [
          Stop(
            id: 'trip-2-stop-1',
            sequence: 1,
            name: 'Cargills Food City — Cinnamon Gardens',
            deliveryWindow: '11:30-13:30',
            plannedArrival: base.add(const Duration(hours: 2, minutes: 12)),
            dock: 'Front receiving bay',
            lat: 6.9147,
            lng: 79.8612,
            orders: [
              order('ORD-5101', 'Cargills Food City — Cinnamon Gardens', 8,
                  ambient),
            ],
            contactPhone: '+94 11 234 5678',
            etaMinutes: 10,
            distanceKm: 1.4,
          ),
          Stop(
            id: 'trip-2-stop-2',
            sequence: 2,
            name: 'Keells Super — Bambalapitiya',
            deliveryWindow: '12:00-14:00',
            plannedArrival: base.add(const Duration(hours: 2, minutes: 30)),
            dock: 'Side entrance',
            lat: 6.8895,
            lng: 79.8565,
            orders: [
              order('ORD-5102', 'Keells Super — Bambalapitiya', 6, chilled),
            ],
            contactPhone: '+94 11 234 5678',
            etaMinutes: 12,
            distanceKm: 2.7,
          ),
        ],
      ),
    ];
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
