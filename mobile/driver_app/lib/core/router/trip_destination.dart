import '../../features/trips/domain/trip.dart';
import 'routes.dart';

/// Where "View trip" should take the driver.
///
/// Offline the saved trip is shown. Otherwise a trip under way opens its
/// active stop, and everything else (loading, ready, finished) opens the trip
/// overview.
String tripDestination(Trip trip, {required bool online}) {
  if (!online) return AppRoutes.offline(trip.id);
  final active = trip.activeStop;
  if (trip.status == TripStatus.inProgress && active != null) {
    return AppRoutes.stop(trip.id, active.id);
  }
  return AppRoutes.trip(trip.id);
}
