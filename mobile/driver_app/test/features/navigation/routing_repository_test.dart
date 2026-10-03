import 'dart:convert';

import 'package:driver_app/features/navigation/data/routing_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const a = LatLng(6.96, 79.88);
  const b = LatLng(7.09, 79.99);

  test('OSRM geometry (lng,lat) becomes LatLng (lat,lng)', () async {
    late Uri requested;
    final repo = OsrmRoutingRepository(MockClient((req) async {
      requested = req.url;
      return http.Response(
          jsonEncode({
            'routes': [
              {
                'geometry': {
                  'coordinates': [
                    [79.88, 6.96],
                    [79.90, 7.00],
                    [79.99, 7.09],
                  ]
                }
              }
            ]
          }),
          200);
    }));

    final pts = await repo.route([a, b]);

    expect(pts, const [LatLng(6.96, 79.88), LatLng(7.0, 79.9), LatLng(7.09, 79.99)]);
    expect(requested.path, contains('79.88,6.96;79.99,7.09'));
    expect(requested.queryParameters['geometries'], 'geojson');
  });

  test('a failing server throws RoutingException', () async {
    final repo =
        OsrmRoutingRepository(MockClient((_) async => http.Response('no', 500)));
    expect(() => repo.route([a, b]), throwsA(isA<RoutingException>()));
  });

  test('a response with no route throws RoutingException', () async {
    final repo = OsrmRoutingRepository(MockClient((_) async =>
        http.Response(jsonEncode({'code': 'NoRoute', 'routes': []}), 200)));
    expect(() => repo.route([a, b]), throwsA(isA<RoutingException>()));
  });

  test('fewer than two points makes no request', () async {
    var calls = 0;
    final repo = OsrmRoutingRepository(MockClient((_) async {
      calls++;
      return http.Response('{}', 200);
    }));
    expect(await repo.route([a]), isEmpty);
    expect(await repo.route(const []), isEmpty);
    expect(calls, 0);
  });

  test('straight-line repository returns the waypoints', () async {
    expect(await const StraightLineRoutingRepository().route([a, b]), [a, b]);
  });
}
