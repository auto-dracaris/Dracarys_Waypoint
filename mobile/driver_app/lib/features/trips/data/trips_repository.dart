import '../domain/trip.dart';
import '../domain/vehicle.dart';

abstract interface class TripsRepository {
  Future<Vehicle> getVehicle();
  Future<List<Trip>> getTrips();

  /// Throws [StateError] if [id] is unknown.
  Future<Trip> getTrip(String id);

  /// Demo hook standing in for the loading team: a loading trip becomes ready.
  /// Other statuses are left alone. Throws [StateError] if [tripId] is unknown.
  Future<Trip> simulateLoadingComplete(String tripId);

  /// Marks the trip as under way. Throws [StateError] if [tripId] is unknown.
  Future<Trip> startTrip(String tripId);

  /// Flags the active stop as arrived (recording the time). No-op if it has
  /// already arrived or the trip has no stops left.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> markArrived(String tripId);

  /// Completes an arrived stop, recording delivered quantities by order id.
  /// No-op unless the stop has arrived. The trip completes with its last stop.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
  });
}
