import '../domain/order.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'trips_repository.dart';

class MockTripsRepository implements TripsRepository {
  MockTripsRepository({
    this.latency = const Duration(milliseconds: 400),
    DateTime? today,
  }) {
    final now = today ?? DateTime.now();
    _trips = _seed(DateTime(now.year, now.month, now.day));
  }

  final Duration latency;
  late List<Trip> _trips;

  Future<void> _wait() => Future<void>.delayed(latency);

  @override
  Future<Vehicle> getVehicle() async {
    await _wait();
    return const Vehicle(plate: 'VEH021', type: 'Refrigerated van');
  }

  @override
  Future<List<Trip>> getTrips() async {
    await _wait();
    return List.unmodifiable(_trips);
  }

  @override
  Future<Trip> getTrip(String id) async {
    await _wait();
    return _trips[_indexOf(id)];
  }

  @override
  Future<Trip> markArrived(String tripId) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    final next = trip.nextStop;
    if (next == null) return trip;

    final stops = [
      for (final s in trip.stops)
        s.id == next.id ? s.copyWith(status: StopStatus.completed) : s,
    ];
    var updated = trip.copyWith(stops: stops);
    if (updated.nextStop == null) {
      updated = updated.copyWith(status: TripStatus.completed);
    }
    _trips = [..._trips]..[i] = updated;
    return updated;
  }

  int _indexOf(String id) {
    final i = _trips.indexWhere((t) => t.id == id);
    if (i == -1) throw StateError('Trip not found: $id');
    return i;
  }

  static List<Trip> _seed(DateTime day) {
    DateTime at(int h, int m) => DateTime(day.year, day.month, day.day, h, m);

    Stop stop(int seq, String name, String window, DateTime eta, double lat,
            double lng,
            {List<Order> orders = const [],
            StopStatus status = StopStatus.pending,
            String tripId = 'trip-1'}) =>
        Stop(
          id: '$tripId-stop-$seq',
          sequence: seq,
          name: name,
          deliveryWindow: window,
          plannedArrival: eta,
          dock: 'Rear loading dock',
          lat: lat,
          lng: lng,
          orders: orders,
          status: status,
        );

    return [
      Trip(
        id: 'trip-1',
        name: 'Trip 1',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(5, 30),
        status: TripStatus.loading,
        stops: [
          stop(1, 'Waypoint Fresh - Kiribathgoda', '05:30-06:30', at(5, 50),
              7.0000, 79.9280, status: StopStatus.completed),
          stop(2, 'Waypoint Fresh - Wattala', '05:45-07:00', at(6, 30),
              6.9890, 79.8900, status: StopStatus.completed),
          stop(3, 'Waypoint Fresh - Ja-Ela', '06:00-08:00', at(7, 10),
              7.0744, 79.8919,
              orders: const [
                Order(
                    id: 'ORD-4521',
                    storeName: 'Waypoint Fresh - Ja-Ela',
                    cases: 12,
                    temperature: Temperature.chilled),
                Order(
                    id: 'ORD-4522',
                    storeName: 'Waypoint Fresh - Ja-Ela',
                    cases: 8,
                    temperature: Temperature.ambient),
              ]),
          stop(4, 'Waypoint Fresh - Gampaha', '07:00-09:00', at(7, 50),
              7.0917, 79.9925),
        ],
      ),
      Trip(
        id: 'trip-2',
        name: 'Trip 2',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(7, 0),
        status: TripStatus.assigned,
        stops: [
          stop(1, 'Waypoint Fresh - Minuwangoda', '08:00-10:00', at(8, 30),
              7.1730, 79.9530, tripId: 'trip-2'),
          stop(2, 'Waypoint Fresh - Veyangoda', '09:00-11:00', at(9, 30),
              7.1600, 80.0980, tripId: 'trip-2'),
        ],
      ),
    ];
  }
}
