import 'dart:convert';

import 'package:driver_app/core/widgets/vehicle_box.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

LatLng _centroid(Map<String, dynamic> feature) {
  final ring = (feature['geometry']['coordinates'][0] as List)
      .take(4)
      .cast<List>();
  final lng =
      ring.map((c) => (c[0] as num).toDouble()).reduce((a, b) => a + b) / 4;
  final lat =
      ring.map((c) => (c[1] as num).toDouble()).reduce((a, b) => a + b) / 4;
  return LatLng(lat, lng);
}

void main() {
  const at = LatLng(7.0, 80.0);

  Map<String, dynamic> decode(double heading) =>
      jsonDecode(vehicleBoxGeoJson(at, heading)) as Map<String, dynamic>;

  test('is a cargo box plus a lower cab with heights and colours', () {
    final f = (decode(0)['features'] as List).cast<Map<String, dynamic>>();
    expect(f, hasLength(2));
    final props = f.map((e) => e['properties'] as Map).toList();
    expect(props[0]['h'], greaterThan(props[1]['h'] as num)); // cargo taller
    expect(props.every((p) => p['b'] != null && p['c'] != null), isTrue);
  });

  test('the cab leads: north at heading 0, east at heading 90', () {
    var f = (decode(0)['features'] as List).cast<Map<String, dynamic>>();
    expect(_centroid(f[1]).latitude, greaterThan(_centroid(f[0]).latitude));

    f = (decode(90)['features'] as List).cast<Map<String, dynamic>>();
    expect(_centroid(f[1]).longitude, greaterThan(_centroid(f[0]).longitude));
    expect(
      (_centroid(f[1]).latitude - _centroid(f[0]).latitude).abs(),
      lessThan(1e-7),
    );
  });

  test('polygons are closed rings centred on the vehicle', () {
    final f = (decode(37)['features'] as List).cast<Map<String, dynamic>>();
    for (final e in f) {
      final ring = (e['geometry']['coordinates'][0] as List);
      expect(ring.first, ring.last);
      expect(ring, hasLength(5));
    }
  });

  test('an empty collection is valid GeoJSON', () {
    final j = jsonDecode(emptyVehicleBoxGeoJson) as Map<String, dynamic>;
    expect(j['type'], 'FeatureCollection');
    expect(j['features'], isEmpty);
  });
}
