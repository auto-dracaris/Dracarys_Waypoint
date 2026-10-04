import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'mock_trips_repository.dart';
import 'trips_repository.dart';

/// Swap this one provider for an API-backed implementation later.
final tripsRepositoryProvider =
    Provider<TripsRepository>((ref) => MockTripsRepository());

// The data providers watch the signed-in driver so their cached data is
// dropped when the driver signs out or a different driver signs in.
final vehicleProvider = FutureProvider<Vehicle>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getVehicle();
});

final tripsProvider = FutureProvider<List<Trip>>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getTrips();
});

final tripProvider = FutureProvider.family<Trip, String>((ref, tripId) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getTrip(tripId);
});

/// Identifies a stop within a trip.
typedef StopRef = ({String tripId, String stopId});

/// A trip together with one of its stops.
class TripStop {
  const TripStop(this.trip, this.stop);

  final Trip trip;
  final Stop stop;
}

/// Errors (rather than returning null) when the trip or stop doesn't exist,
/// so screens show their standard error view.
final tripStopProvider =
    FutureProvider.family<TripStop, StopRef>((ref, key) async {
  final trip = await ref.watch(tripProvider(key.tripId).future);
  final stop = trip.stops.where((s) => s.id == key.stopId).firstOrNull;
  if (stop == null) throw StateError('Stop not found: ${key.stopId}');
  return TripStop(trip, stop);
});
