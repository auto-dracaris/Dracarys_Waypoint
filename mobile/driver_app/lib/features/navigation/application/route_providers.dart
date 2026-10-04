import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../../../core/demo_mode.dart';
import '../../../core/api/api_providers.dart';
import '../../../core/storage/offline_cache.dart';
import '../../../core/widgets/map_view.dart';
import '../data/route_smoothing.dart';
import '../data/routing_repository.dart';

final routingRepositoryProvider = Provider<RoutingRepository>((ref) {
  if (!ref.watch(mapTilesEnabledProvider)) {
    return const StraightLineRoutingRepository();
  }
  if (!ref.watch(demoModeProvider)) {
    return ApiRoutingRepository(ref.watch(apiClientProvider));
  }
  final client = http.Client();
  ref.onDispose(client.close);
  return OsrmRoutingRepository(client);
});

/// Value-equal waypoint list, so it can key a provider family.
@immutable
class RouteRequest {
  const RouteRequest(this.waypoints);

  final List<LatLng> waypoints;

  @override
  bool operator ==(Object other) =>
      other is RouteRequest && listEquals(other.waypoints, waypoints);

  @override
  int get hashCode => Object.hashAll(waypoints);
}

/// Where a road line is kept: one entry per ordered list of waypoints.
String roadRouteKey(List<LatLng> waypoints) {
  final text = waypoints
      .map((p) => '${p.latitude.toStringAsFixed(5)},${p.longitude.toStringAsFixed(5)}')
      .join(';');
  return 'road:${sha1.convert(utf8.encode(text))}';
}

/// Road geometry for [RouteRequest] with its corners rounded into arcs, so the
/// line is drawn the way a vehicle drives it and the van sits exactly on it.
///
/// Every road line fetched is kept on the phone. With no signal the saved line
/// for the same stops is drawn, so the driver still sees the real road; only a
/// route never seen before falls back to straight lines between the stops.
final roadRouteProvider = FutureProvider.family<List<LatLng>, RouteRequest>((
  ref,
  req,
) async {
  final cache = ref.watch(offlineCacheProvider);
  final key = roadRouteKey(req.waypoints);
  try {
    final line = await ref.watch(routingRepositoryProvider).route(req.waypoints);
    if (line.length > 1) {
      await cache.putJson(key, [for (final p in line) [p.latitude, p.longitude]]);
    }
    return roundCorners(line);
  } on RoutingException {
    final saved = await cache.getJson(key);
    if (saved is List && saved.length > 1) {
      return roundCorners([
        for (final p in saved)
          LatLng((p[0] as num).toDouble(), (p[1] as num).toDouble()),
      ]);
    }
    return roundCorners(req.waypoints);
  }
});
