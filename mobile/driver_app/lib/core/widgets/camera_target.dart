import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

/// Where a [MapView] should point its camera; the map animates there whenever
/// a different target is passed in.
@immutable
class CameraTarget {
  const CameraTarget({
    required this.point,
    this.bearing = 0,
    this.zoom,
    this.pitch = 0,
  });

  final LatLng point;
  final double bearing;
  final double? zoom;
  final double pitch;

  @override
  bool operator ==(Object other) =>
      other is CameraTarget &&
      other.point == point &&
      other.bearing == bearing &&
      other.zoom == zoom &&
      other.pitch == pitch;

  @override
  int get hashCode => Object.hash(point, bearing, zoom, pitch);
}
