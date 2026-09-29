import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'mock_trips_repository.dart';
import 'trips_repository.dart';

/// Swap this one provider for an API-backed implementation later.
final tripsRepositoryProvider =
    Provider<TripsRepository>((ref) => MockTripsRepository());

// Both providers watch the signed-in driver so their cached data is dropped
// when the driver signs out or a different driver signs in.
final vehicleProvider = FutureProvider<Vehicle>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getVehicle();
});

final tripsProvider = FutureProvider<List<Trip>>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getTrips();
});
