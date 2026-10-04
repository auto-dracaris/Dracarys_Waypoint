import 'package:driver_app/core/router/trip_destination.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

Future<Trip> trip1() async => (await MockTripsRepository(
            latency: Duration.zero, today: DateTime(2026, 9, 29))
        .getTrips())
    .first;

void main() {
  test('offline always opens the saved-trip screen', () async {
    final trip = await trip1();
    for (final status in TripStatus.values) {
      expect(tripDestination(trip.copyWith(status: status), online: false),
          '/trips/trip/trip-1/offline');
    }
  });

  test('a trip that is loading or ready opens its overview', () async {
    final trip = await trip1();
    expect(tripDestination(trip.copyWith(status: TripStatus.loading), online: true),
        '/trips/trip/trip-1');
    expect(tripDestination(trip.copyWith(status: TripStatus.ready), online: true),
        '/trips/trip/trip-1');
    expect(tripDestination(trip.copyWith(status: TripStatus.assigned), online: true),
        '/trips/trip/trip-1');
  });

  test('a trip under way opens its active stop', () async {
    final trip = await trip1();
    expect(
        tripDestination(trip.copyWith(status: TripStatus.inProgress),
            online: true),
        '/trips/trip/trip-1/stop/trip-1-stop-3');
  });

  test('a finished trip opens its overview', () async {
    final trip = await trip1();
    expect(
        tripDestination(trip.copyWith(status: TripStatus.completed),
            online: true),
        '/trips/trip/trip-1');
  });
}
