import 'dart:convert';

import 'package:driver_app/core/api/api_client.dart';
import 'package:driver_app/core/api/token_store.dart';
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
    final repo = OsrmRoutingRepository(
      MockClient((req) async {
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
                  ],
                },
              },
            ],
          }),
          200,
        );
      }),
    );

    final pts = await repo.route([a, b]);

    expect(pts, const [
      LatLng(6.96, 79.88),
      LatLng(7.0, 79.9),
      LatLng(7.09, 79.99),
    ]);
    expect(requested.path, contains('79.88,6.96;79.99,7.09'));
    expect(requested.queryParameters['geometries'], 'geojson');
  });

  test('a failing server throws RoutingException', () async {
    final repo = OsrmRoutingRepository(
      MockClient((_) async => http.Response('no', 500)),
    );
    expect(() => repo.route([a, b]), throwsA(isA<RoutingException>()));
  });

  test('a response with no route throws RoutingException', () async {
    final repo = OsrmRoutingRepository(
      MockClient(
        (_) async =>
            http.Response(jsonEncode({'code': 'NoRoute', 'routes': []}), 200),
      ),
    );
    expect(() => repo.route([a, b]), throwsA(isA<RoutingException>()));
  });

  test('fewer than two points makes no request', () async {
    var calls = 0;
    final repo = OsrmRoutingRepository(
      MockClient((_) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    expect(await repo.route([a]), isEmpty);
    expect(await repo.route(const []), isEmpty);
    expect(calls, 0);
  });

  test('straight-line repository returns the waypoints', () async {
    expect(await const StraightLineRoutingRepository().route([a, b]), [a, b]);
  });

  group('ApiRoutingRepository', () {
    ApiRoutingRepository build(
      http.Response Function(http.Request) respond, [
      List<http.Request>? sent,
    ]) {
      return ApiRoutingRepository(
        ApiClient(
          baseUrl: 'http://api.test/api',
          tokens: InMemoryTokenStore(access: 'A1', refresh: 'R1'),
          client: MockClient((req) async {
            sent?.add(req);
            return respond(req);
          }),
        ),
      );
    }

    http.Response envelope(int status, String message, [Object? data]) =>
        http.Response(
          jsonEncode({'statusCode': status, 'message': message, 'data': data}),
          status,
          headers: {'content-type': 'application/json'},
        );

    test('posts the waypoints and reads the [lng, lat] geometry', () async {
      final sent = <http.Request>[];
      final repo = build((_) {
        return envelope(200, 'Route calculated', {
          'profile': 'van',
          'geometry': [
            [79.88, 6.96],
            [79.99, 7.09],
          ],
          'distanceMeters': 1000,
          'durationSeconds': 120,
          'legs': [],
        });
      }, sent);

      final line = await repo.route(const [a, b]);
      expect(line, const [LatLng(6.96, 79.88), LatLng(7.09, 79.99)]);
      expect(sent.single.url.path, '/api/routing/route');
      expect(jsonDecode(sent.single.body), {
        'waypoints': [
          {'lat': 6.96, 'lng': 79.88},
          {'lat': 7.09, 'lng': 79.99},
        ],
      });
    });

    test('fewer than two waypoints is empty without a call', () async {
      final sent = <http.Request>[];
      final repo = build((_) => envelope(200, 'ok'), sent);
      expect(await repo.route(const [a]), isEmpty);
      expect(sent, isEmpty);
    });

    test('an API failure becomes a RoutingException', () async {
      final repo = build(
        (_) => envelope(422, 'No road route was found between those points'),
      );
      await expectLater(
        repo.route(const [a, b]),
        throwsA(
          isA<RoutingException>().having(
            (e) => e.message,
            'message',
            'No road route was found between those points',
          ),
        ),
      );
    });

    test('an unreachable server becomes a RoutingException', () async {
      final repo = ApiRoutingRepository(
        ApiClient(
          baseUrl: 'http://api.test/api',
          tokens: InMemoryTokenStore(access: 'A1', refresh: 'R1'),
          client: MockClient((_) async => throw http.ClientException('down')),
        ),
      );
      await expectLater(
        repo.route(const [a, b]),
        throwsA(isA<RoutingException>()),
      );
    });
  });
}
