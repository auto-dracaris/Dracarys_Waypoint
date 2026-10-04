import '../domain/route_change.dart';

abstract interface class RouteChangesRepository {
  /// The pending (or already acknowledged) change for a trip; null if the
  /// dispatcher has not changed its route.
  Future<RouteChange?> get(String tripId);

  /// Marks the change as accepted. Repeating it is harmless.
  /// Throws [StateError] if the trip has no route change.
  Future<RouteChange> acknowledge(String tripId);
}
