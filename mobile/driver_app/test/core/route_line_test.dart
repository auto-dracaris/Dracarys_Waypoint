import 'dart:convert';

import 'package:driver_app/core/widgets/route_line.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  test('a route becomes a LineString in lng,lat order', () {
    final j = jsonDecode(routeLineGeoJson(const [
      LatLng(7.0, 80.0),
      LatLng(7.1, 80.2),
    ])) as Map<String, dynamic>;
    expect(j['type'], 'Feature');
    expect(j['geometry']['type'], 'LineString');
    expect(j['geometry']['coordinates'], [
      [80.0, 7.0],
      [80.2, 7.1],
    ]);
  });

  test('fewer than two points draws nothing (still valid GeoJSON)', () {
    for (final r in [const <LatLng>[], const [LatLng(7, 80)]]) {
      final j = jsonDecode(routeLineGeoJson(r)) as Map<String, dynamic>;
      expect(j['type'], 'FeatureCollection');
      expect(j['features'], isEmpty);
    }
  });
}
