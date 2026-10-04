import '../domain/trip.dart';
import '../domain/vehicle.dart';

abstract interface class TripsRepository {
  /// True when the backend guards the run with codes: the start code the
  /// loader hands over before departure, and the code each outlet gives on
  /// receipt. The in-memory mock needs neither.
  bool get usesCodes;

  Future<Vehicle> getVehicle();

  /// The driver's trips for [date] (a calendar day; today when null).
  Future<List<Trip>> getTrips({DateTime? date});

  /// Throws [StateError] if [id] is unknown.
  Future<Trip> getTrip(String id);

  /// Demo hook standing in for the loading team: a loading trip becomes ready.
  /// Other statuses are left alone. Only the mock acts on it; with the real
  /// API the loader marks the trip loaded.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> simulateLoadingComplete(String tripId);

  /// Marks the trip as under way. With [usesCodes], [otp] is the six-digit
  /// start code. Throws [StateError] if [tripId] is unknown.
  Future<Trip> startTrip(String tripId, {String? otp});

  /// Flags the active stop as arrived (recording the time). No-op if it has
  /// already arrived or the trip has no stops left.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> markArrived(String tripId);

  /// Completes an arrived stop, recording delivered quantities by order id.
  /// No-op unless the stop has arrived. The trip completes with its last stop.
  /// [deliveryCode] is the code the outlet gave on receipt; leave it out only
  /// when a proof of delivery was recorded instead.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  });
}
