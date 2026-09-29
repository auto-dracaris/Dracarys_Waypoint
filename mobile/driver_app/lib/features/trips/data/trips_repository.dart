import '../domain/trip.dart';
import '../domain/vehicle.dart';

abstract interface class TripsRepository {
  Future<Vehicle> getVehicle();
  Future<List<Trip>> getTrips();

  /// Throws [StateError] if [id] is unknown.
  Future<Trip> getTrip(String id);

  /// Completes the next pending stop. No-op if none are pending.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> markArrived(String tripId);
}
