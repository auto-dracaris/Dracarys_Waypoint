import 'package:latlong2/latlong.dart';

/// Where the vehicle is right now, as reported by a [LocationSource].
class VehiclePosition {
  const VehiclePosition({
    required this.point,
    required this.heading,
    required this.speedKmh,
    required this.remainingMeters,
  });

  final LatLng point;

  /// Compass degrees, 0 = north, clockwise.
  final double heading;
  final double speedKmh;

  /// Distance left to the end of the route being followed.
  final double remainingMeters;
}

/// Supplies live vehicle positions. The app uses a simulator until the backend
/// (or real GPS) exists; a real source only has to implement this.
abstract class LocationSource {
  Stream<VehiclePosition> follow(List<LatLng> route);
}
