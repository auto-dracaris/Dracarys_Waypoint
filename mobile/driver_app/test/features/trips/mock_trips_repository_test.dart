import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/order.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

final _now = DateTime(2026, 9, 29, 7, 8);

MockTripsRepository repo() => MockTripsRepository(
      latency: Duration.zero,
      today: DateTime(2026, 9, 29),
      now: () => _now,
    );

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

    expect(trips[0].stops.map((s) => s.name), [
      'Cargills Food City — Kadawatha',
      'Keells Super — Kiribathgoda',
      'Waypoint Fresh — Ja-Ela',
      'Lanka Sathosa — Ragama',
    ]);
    expect(trips[0].stops.map((s) => s.orders.length), [3, 2, 2, 1]);

    final next = trips[0].nextStop!;
    expect(next.sequence, 3);
    expect(next.deliveryWindow, '06:00-08:00');
    expect(next.dock, 'Rear loading dock');
    expect(next.etaMinutes, 18);
    expect(next.distanceKm, 7.2);
    expect(next.orders.map((o) => o.id), ['ORD-4521', 'ORD-4522']);
    expect(next.orders.first.temperature, Temperature.chilled);
    expect(next.orders.first.handling, 'Keep cold chain intact.');
    expect(trips[0].stops.last.dock, 'Check receiving entrance');
  });

  test('activeStop is the first stop that is not completed', () async {
    final trip = (await repo().getTrips()).first;
    expect(trip.activeStop!.sequence, 3);
    expect(trip.activeStop!.status, StopStatus.pending);
  });

  test('startTrip moves a trip to in progress', () async {
    final r = repo();
    final started = await r.startTrip('trip-1');
    expect(started.status, TripStatus.inProgress);
    expect((await r.getTrip('trip-1')).status, TripStatus.inProgress);
  });

  test('markArrived flags the active stop as arrived with the time', () async {
    final r = repo();
    final updated = await r.markArrived('trip-1');
    final stop = updated.activeStop!;
    expect(stop.sequence, 3);
    expect(stop.status, StopStatus.arrived);
    expect(stop.arrivedAt, _now);
    expect(updated.completedStops, 2); // arriving is not completing
  });

  test('markArrived twice keeps the first arrival time', () async {
    final r = repo();
    await r.markArrived('trip-1');
    final again = await r.markArrived('trip-1');
    expect(again.activeStop!.status, StopStatus.arrived);
    expect(again.activeStop!.arrivedAt, _now);
  });

  test('completeStop finishes an arrived stop and advances progress',
      () async {
    final r = repo();
    await r.markArrived('trip-1');
    final updated = await r.completeStop('trip-1', 'trip-1-stop-3',
        deliveredCases: {'ORD-4521': 12, 'ORD-4522': 7});

    expect(updated.completedStops, 3);
    expect(updated.activeStop!.sequence, 4);
    final done = updated.stops[2];
    expect(done.status, StopStatus.completed);
    expect(done.orders.map((o) => o.deliveredCases), [12, 7]);
    expect(done.orders.every((o) => o.status == OrderStatus.delivered), isTrue);
  });

  test('completeStop on a stop that has not arrived is a no-op', () async {
    final r = repo();
    final same = await r.completeStop('trip-1', 'trip-1-stop-3');
    expect(same.completedStops, 2);
    expect(same.stops[2].status, StopStatus.pending);
  });

  test('completing the last stop completes the trip', () async {
    final r = repo();
    await r.markArrived('trip-1');
    await r.completeStop('trip-1', 'trip-1-stop-3');
    await r.markArrived('trip-1');
    final done = await r.completeStop('trip-1', 'trip-1-stop-4');
    expect(done.status, TripStatus.completed);
    expect(done.activeStop, isNull);
    expect(done.completedStops, 4);
  });

  test('markArrived on a completed trip is a no-op', () async {
    final r = repo();
    await r.markArrived('trip-1');
    await r.completeStop('trip-1', 'trip-1-stop-3');
    await r.markArrived('trip-1');
    await r.completeStop('trip-1', 'trip-1-stop-4');
    final again = await r.markArrived('trip-1');
    expect(again.completedStops, 4);
    expect(again.status, TripStatus.completed);
  });

  test('unknown trip ids throw StateError', () async {
    final r = repo();
    expect(() => r.getTrip('nope'), throwsStateError);
    expect(() => r.startTrip('nope'), throwsStateError);
    expect(() => r.markArrived('nope'), throwsStateError);
    expect(() => r.completeStop('nope', 'x'), throwsStateError);
  });
}
