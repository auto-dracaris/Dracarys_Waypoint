import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../../../core/widgets/map_view.dart';
import '../data/routing_repository.dart';

final routingRepositoryProvider = Provider<RoutingRepository>((ref) {
  if (!ref.watch(mapTilesEnabledProvider)) {
    return const StraightLineRoutingRepository();
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

/// Road geometry for [RouteRequest]; falls back to straight lines when the
/// routing service is unreachable so the map never loses its route.
final roadRouteProvider =
    FutureProvider.family<List<LatLng>, RouteRequest>((ref, req) async {
  try {
    return await ref.watch(routingRepositoryProvider).route(req.waypoints);
  } on RoutingException {
    return req.waypoints;
  }
});
