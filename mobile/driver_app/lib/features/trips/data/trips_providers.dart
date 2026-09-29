import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'mock_trips_repository.dart';
import 'trips_repository.dart';

/// Swap this one provider for an API-backed implementation later.
final tripsRepositoryProvider =
    Provider<TripsRepository>((ref) => MockTripsRepository());

final vehicleProvider = FutureProvider<Vehicle>(
    (ref) => ref.watch(tripsRepositoryProvider).getVehicle());

final tripsProvider = FutureProvider<List<Trip>>(
    (ref) => ref.watch(tripsRepositoryProvider).getTrips());
