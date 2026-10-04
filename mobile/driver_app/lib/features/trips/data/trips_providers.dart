import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/demo_mode.dart';
import '../../../core/api/api_config.dart' show demoArea;
import '../../../core/api/api_providers.dart';
import '../../../core/clock.dart';
import '../../../core/storage/offline_cache.dart';
import '../../sync/data/sync_providers.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'http_trips_repository.dart';
import 'mock_trips_repository.dart';
import 'trips_repository.dart';

/// The hosted API, or the in-memory demo data with `--dart-define=USE_MOCKS=true`.
final tripsRepositoryProvider = Provider<TripsRepository>((ref) {
  if (ref.watch(demoModeProvider)) return MockTripsRepository(area: demoArea);
  return HttpTripsRepository(
    ref.watch(apiClientProvider),
    cache: ref.watch(offlineCacheProvider),
    submitter: ref.watch(actionSubmitterProvider),
    queue: ref.watch(actionQueueProvider),
    now: ref.watch(clockProvider),
  );
});

/// The delivery day My trips is showing. Starts on today.
class TripsDateNotifier extends Notifier<DateTime> {
  @override
  DateTime build() {
    final now = ref.read(clockProvider)();
    return DateTime(now.year, now.month, now.day);
  }

  void set(DateTime day) => state = DateTime(day.year, day.month, day.day);

  void shift(int days) =>
      state = DateTime(state.year, state.month, state.day + days);
}

final tripsDateProvider = NotifierProvider<TripsDateNotifier, DateTime>(
  TripsDateNotifier.new,
);

// The data providers watch the signed-in driver so their cached data is
// dropped when the driver signs out or a different driver signs in.
final vehicleProvider = FutureProvider<Vehicle>((ref) {
  ref.watch(authControllerProvider);
  return ref.watch(tripsRepositoryProvider).getVehicle();
});

final tripsProvider = FutureProvider<List<Trip>>((ref) {
  ref.watch(authControllerProvider);
  final date = ref.watch(tripsDateProvider);
  return ref.watch(tripsRepositoryProvider).getTrips(date: date);
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
final tripStopProvider = FutureProvider.family<TripStop, StopRef>((
  ref,
  key,
) async {
  final trip = await ref.watch(tripProvider(key.tripId).future);
  final stop = trip.stops.where((s) => s.id == key.stopId).firstOrNull;
  if (stop == null) throw StateError('Stop not found: ${key.stopId}');
  return TripStop(trip, stop);
});
