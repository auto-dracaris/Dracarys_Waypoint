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

  test('vehicle length shrinks as you zoom in and is clamped', () {
    final far = vehicleLengthFor(15, 7);
    final near = vehicleLengthFor(19, 7);
    expect(far, greaterThan(near));
    expect(vehicleLengthFor(30, 7), 2.5); // never smaller than a small van
    expect(vehicleLengthFor(1, 7), 60); // never absurdly large
  });

  test('proportions follow the length', () {
    final f = (jsonDecode(vehicleBoxGeoJson(at, 0, length: 10))['features']
            as List)
        .cast<Map<String, dynamic>>();
    expect(f[0]['properties']['h'], closeTo(5 + 1, 0.001)); // 0.5L cargo + 0.1L base
  });
}
