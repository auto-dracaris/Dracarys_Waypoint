import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/order.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

MockTripsRepository repo() => MockTripsRepository(
    latency: Duration.zero, today: DateTime(2026, 9, 29));

void main() {
  test('seeds the Figma story', () async {
    final r = repo();
    final vehicle = await r.getVehicle();
    expect(vehicle.plate, 'VEH021');
    expect(vehicle.type, 'Refrigerated van');

    final trips = await r.getTrips();
    expect(trips.map((t) => t.name), ['Trip 1', 'Trip 2']);
    expect(trips[0].stops.length, 4);
    expect(trips[0].completedStops, 2);
    expect(trips[0].status, TripStatus.loading);
    expect(trips[1].stops.length, 2);

    final next = trips[0].nextStop!;
    expect(next.sequence, 3);
    expect(next.name, 'Waypoint Fresh - Ja-Ela');
    expect(next.orders.map((o) => o.id), ['ORD-4521', 'ORD-4522']);
    expect(next.orders.first.temperature, Temperature.chilled);
  });

  test('markArrived completes the next stop and advances progress', () async {
    final r = repo();
    final updated = await r.markArrived('trip-1');
    expect(updated.completedStops, 3);
    expect(updated.nextStop!.sequence, 4);
    expect((await r.getTrip('trip-1')).completedStops, 3);
  });

  test('markArrived on the last stop completes the trip', () async {
    final r = repo();
    await r.markArrived('trip-1');
    final done = await r.markArrived('trip-1');
    expect(done.status, TripStatus.completed);
    expect(done.nextStop, isNull);
    expect(done.stops.every((s) => s.status == StopStatus.completed), isTrue);
  });

  test('markArrived on an already completed trip is a no-op', () async {
    final r = repo();
    await r.markArrived('trip-1');
    await r.markArrived('trip-1');
    final again = await r.markArrived('trip-1');
    expect(again.completedStops, 4);
    expect(again.status, TripStatus.completed);
  });

  test('getTrip / markArrived with unknown id throw StateError', () async {
    final r = repo();
    expect(() => r.getTrip('nope'), throwsStateError);
    expect(() => r.markArrived('nope'), throwsStateError);
  });
}
