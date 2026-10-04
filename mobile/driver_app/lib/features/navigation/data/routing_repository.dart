import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';

class RoutingException implements Exception {
  const RoutingException(this.message);

  final String message;

  @override
  String toString() => 'RoutingException: $message';
}

/// Road geometry through an ordered list of waypoints.
abstract class RoutingRepository {
  /// Empty when fewer than two waypoints; throws [RoutingException] on failure.
  Future<List<LatLng>> route(List<LatLng> waypoints);
}

/// Routes over real roads using an OSRM server. The public demo server is for
/// development only; point [baseUrl] at our own instance for production.
class OsrmRoutingRepository implements RoutingRepository {
  OsrmRoutingRepository(
    this._client, {
    this.baseUrl = 'https://router.project-osrm.org',
    this.timeout = const Duration(seconds: 10),
  });

  final http.Client _client;
  final String baseUrl;
  final Duration timeout;

  @override
  Future<List<LatLng>> route(List<LatLng> waypoints) async {
    if (waypoints.length < 2) return const [];
    final coords = waypoints
        .map((p) => '${p.longitude},${p.latitude}')
        .join(';');
    final uri = Uri.parse(
      '$baseUrl/route/v1/driving/$coords',
    ).replace(queryParameters: {'overview': 'full', 'geometries': 'geojson'});
    try {
      final res = await _client.get(uri).timeout(timeout);
      if (res.statusCode != 200) {
        throw RoutingException('OSRM returned ${res.statusCode}');
      }
      final routes =
          (jsonDecode(res.body) as Map<String, dynamic>)['routes']
              as List<dynamic>?;
      if (routes == null || routes.isEmpty) {
        throw const RoutingException('No route found');
      }
      final line =
          (routes.first as Map<String, dynamic>)['geometry']['coordinates']
              as List<dynamic>;
      return [
        for (final c in line)
          LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()),
      ];
    } on RoutingException {
      rethrow;
    } catch (e) {
      throw RoutingException('Routing failed: $e');
    }
  }
}

/// Offline / test fallback: just joins the waypoints with straight lines.
class StraightLineRoutingRepository implements RoutingRepository {
  const StraightLineRoutingRepository();

  @override
  Future<List<LatLng>> route(List<LatLng> waypoints) async =>
      waypoints.length < 2 ? const [] : waypoints;
}

/// Routes through the Waypoint API (`POST /routing/route`), which proxies the
/// project's own OSRM with a profile per vehicle type (the caller's vehicle by
/// default). Waypoints are limited to 25 by the API.
class ApiRoutingRepository implements RoutingRepository {
  ApiRoutingRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<LatLng>> route(List<LatLng> waypoints) async {
    if (waypoints.length < 2) return const [];
    try {
      final data = await _api.post(
        '/routing/route',
        body: {
          'waypoints': [
            for (final p in waypoints.take(25))
              {'lat': p.latitude, 'lng': p.longitude},
          ],
        },
      ) as Map<String, dynamic>;
      // GeoJSON orders each pair [longitude, latitude].
      return [
        for (final c in (data['geometry'] as List))
          LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()),
      ];
    } on ApiException catch (e) {
      throw RoutingException(e.message);
    } catch (e) {
      throw RoutingException('Routing failed: $e');
    }
  }
}
