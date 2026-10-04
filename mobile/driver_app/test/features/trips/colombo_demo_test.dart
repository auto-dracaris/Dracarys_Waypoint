import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  test('the Colombo demo trip is a short loop of roughly 1 km legs', () async {
    final repo = MockTripsRepository(latency: Duration.zero, area: 'colombo');
    final trips = await repo.getTrips();
    expect(trips.map((t) => t.name), ['Trip 1', 'Trip 2']);
    final trip = trips.first;
    const d = Distance();
    var from = const LatLng(
      6.9319,
      79.8441,
    ); // MockAuthRepository.colomboDriver depot
    expect(MockAuthRepository.colomboDriver.depotLat, from.latitude);
    for (final s in trip.stops) {
      final to = LatLng(s.lat, s.lng);
      final km = d(from, to) / 1000;
      expect(km, inInclusiveRange(0.6, 1.6), reason: s.name);
      from = to;
    }
    expect(trip.stops, hasLength(4));
  });
}
