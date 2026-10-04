import 'package:driver_app/core/storage/local_store.dart';
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

/// A road line with a bend, so it can be told apart from straight lines.
class _Bendy implements RoutingRepository {
  static const line = [
    LatLng(6.96, 79.88),
    LatLng(6.96, 79.95),
    LatLng(7.09, 79.99),
  ];

  @override
  Future<List<LatLng>> route(List<LatLng> waypoints) async => line;
}

void main() {
  const pts = [LatLng(6.96, 79.88), LatLng(7.09, 79.99)];

  ProviderContainer container(RoutingRepository repo, LocalStore store) {
    final c = ProviderContainer(overrides: [
      routingRepositoryProvider.overrideWithValue(repo),
      localStoreProvider.overrideWithValue(store),
    ]);
    addTearDown(c.dispose);
    return c;
  }

  test('falls back to straight lines when routing fails and nothing is saved',
      () async {
    final c = container(_Failing(), MemoryLocalStore());
    expect(
        await c.read(roadRouteProvider(const RouteRequest(pts)).future), pts);
  });

  test('a road fetched once is drawn again with no signal', () async {
    final store = MemoryLocalStore();

    final online = container(_Bendy(), store);
    final live =
        await online.read(roadRouteProvider(const RouteRequest(pts)).future);
    expect(live.length, greaterThan(2));

    // Next time the routing service cannot be reached, but the same stops
    // were driven before: the real road comes back, not a straight line.
    final offline = container(_Failing(), store);
    final saved =
        await offline.read(roadRouteProvider(const RouteRequest(pts)).future);
    expect(saved, live);
    expect(saved, isNot(pts));
  });

  test('a saved road is only used for the same stops', () async {
    final store = MemoryLocalStore();
    final online = container(_Bendy(), store);
    await online.read(roadRouteProvider(const RouteRequest(pts)).future);

    const other = [LatLng(6.5, 79.5), LatLng(6.6, 79.6)];
    final offline = container(_Failing(), store);
    expect(
        await offline.read(roadRouteProvider(const RouteRequest(other)).future),
        other);
  });

  test('the key is stable and differs by stop order', () {
    expect(roadRouteKey(pts), roadRouteKey(List.of(pts)));
    expect(roadRouteKey(pts), isNot(roadRouteKey(pts.reversed.toList())));
    expect(roadRouteKey(pts).length, lessThan(60));
  });

  test('equal waypoint lists share one provider instance', () {
    expect(
        const RouteRequest(pts),
        const RouteRequest([LatLng(6.96, 79.88), LatLng(7.09, 79.99)]));
  });
}
