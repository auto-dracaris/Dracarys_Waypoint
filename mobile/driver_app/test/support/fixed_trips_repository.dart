import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:driver_app/features/trips/domain/vehicle.dart';

/// Serves exactly the trips it is given, whatever the day asked for.
class FixedTripsRepository implements TripsRepository {
  FixedTripsRepository(this.trips);

  final List<Trip> trips;

  @override
  bool get usesCodes => false;

  @override
  Future<Vehicle> getVehicle() async =>
      const Vehicle(plate: 'VEH021', type: 'Refrigerated van');

  @override
  Future<List<Trip>> getTrips({DateTime? date}) async => trips;

  @override
  Future<Trip> getTrip(String id) async => trips.firstWhere((t) => t.id == id);

  @override
  Future<Trip> simulateLoadingComplete(String tripId) async => getTrip(tripId);

  @override
  Future<Trip> startTrip(String tripId, {String? otp}) async => getTrip(tripId);

  @override
  Future<Trip> markArrived(String tripId) async => getTrip(tripId);

  @override
  Future<Trip> completeStop(
    String tripId,
    String stopId, {
    Map<String, int> deliveredCases = const {},
    String? deliveryCode,
  }) async => getTrip(tripId);
}
