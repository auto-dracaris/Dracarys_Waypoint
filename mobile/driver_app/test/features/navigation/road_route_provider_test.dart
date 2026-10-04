import 'package:driver_app/features/navigation/application/route_providers.dart';
import 'package:driver_app/features/navigation/data/routing_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

class _Failing implements RoutingRepository {
  @override
  Future<List<LatLng>> route(List<LatLng> waypoints) =>
      throw const RoutingException('offline');
}

void main() {
  const pts = [LatLng(6.96, 79.88), LatLng(7.09, 79.99)];

  test('falls back to straight lines when routing fails', () async {
    final c = ProviderContainer(
        overrides: [routingRepositoryProvider.overrideWithValue(_Failing())]);
    addTearDown(c.dispose);
    expect(await c.read(roadRouteProvider(const RouteRequest(pts)).future), pts);
  });

  test('equal waypoint lists share one provider instance', () {
    expect(const RouteRequest(pts), const RouteRequest([LatLng(6.96, 79.88), LatLng(7.09, 79.99)]));
  });
}
