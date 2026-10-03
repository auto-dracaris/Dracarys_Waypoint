import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

/// Source/layer ids for the 3D vehicle drawn by [MapView].
const vehicleBoxSourceId = 'wp-vehicle';
const vehicleBoxLayerId = 'wp-vehicle-3d';

const emptyVehicleBoxGeoJson = '{"type":"FeatureCollection","features":[]}';

const _cargoColor = '#FACC15'; // AppColors.primary
const _cabColor = '#2B2422'; // AppColors.ink

/// How long the van should be, in metres, so it measures about [pixels] on
/// screen at [zoom]. Map tiles are 512 px, so a screen pixel spans
/// 78271.5 * cos(latitude) / 2^(zoom + 1) metres. Sizing by pixels (not by a
/// real-world minimum) keeps the van from ballooning over the road when the
/// camera is close, because the map style draws roads at a fixed pixel width.
double vehicleLengthFor(double zoom, double latitude, {double pixels = 64}) {
  final metersPerPixel =
      78271.517 * math.cos(latitude * math.pi / 180) / math.pow(2, zoom + 1);
  return (pixels * metersPerPixel).clamp(0.3, 60.0).toDouble();
}

/// A delivery van as two extruded boxes (a tall cargo box behind a lower cab)
/// centred on [center] and pointing along [heading] (compass degrees).
///
/// Proportions follow [length]; size it with [vehicleLengthFor]. Each feature
/// carries
/// `h` (top, metres), `b` (base, metres) and `c` (colour) for a data-driven
/// fill-extrusion layer.
String vehicleBoxGeoJson(LatLng center, double heading, {double length = 4.8}) {
  final width = length * 0.42;
  final h = heading * math.pi / 180;
  final fx = math.sin(h), fy = math.cos(h); // forward: east, north
  final rx = math.cos(h), ry = -math.sin(h); // right: east, north
  final metersPerDegLat = 111320.0;
  final metersPerDegLng = 111320.0 * math.cos(center.latitude * math.pi / 180);

  List<double> pt(double along, double across) {
    final east = fx * along + rx * across;
    final north = fy * along + ry * across;
    return [
      center.longitude + east / metersPerDegLng,
      center.latitude + north / metersPerDegLat,
    ];
  }

  Map<String, dynamic> box(
    double from,
    double to,
    double halfWidth,
    num top,
    num base,
    String c,
  ) {
    final ring = [
      pt(from, -halfWidth),
      pt(from, halfWidth),
      pt(to, halfWidth),
      pt(to, -halfWidth),
    ];
    return {
      'type': 'Feature',
      'properties': {'h': top, 'b': base, 'c': c},
      'geometry': {
        'type': 'Polygon',
        'coordinates': [
          [...ring, ring.first],
        ],
      },
    };
  }

  final cabLength = length * 0.32;
  final back = -length / 2, front = length / 2;
  return jsonEncode({
    'type': 'FeatureCollection',
    'features': [
      box(
        back,
        front - cabLength,
        width / 2,
        length * 0.6,
        length * 0.1,
        _cargoColor,
      ),
      box(
        front - cabLength,
        front,
        width / 2 * 0.92,
        length * 0.44,
        length * 0.1,
        _cabColor,
      ),
    ],
  });
}

/// Where the 3D van is and which way it points.
@immutable
class Vehicle3D {
  const Vehicle3D({required this.point, required this.heading});

  final LatLng point;
  final double heading;

  @override
  bool operator ==(Object other) =>
      other is Vehicle3D && other.point == point && other.heading == heading;

  @override
  int get hashCode => Object.hash(point, heading);
}
