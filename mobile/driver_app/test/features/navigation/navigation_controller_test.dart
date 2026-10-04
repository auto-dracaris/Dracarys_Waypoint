import 'package:driver_app/features/navigation/application/navigation_controller.dart';
import 'package:driver_app/features/navigation/data/location_source.dart';
import 'package:driver_app/features/navigation/data/simulated_location_source.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

const _a = LatLng(6.0, 80.0);
const _b = LatLng(6.009, 80.0);
const _c = LatLng(6.009, 80.009);

class _Counting implements LocationSource {
  int calls = 0;
  @override
  Stream<VehiclePosition> follow(List<LatLng> route) {
    calls++;
    return const SimulatedLocationSource(
            speedKmh: 3.6e7, tick: Duration(milliseconds: 4))
        .follow(route);
  }
}

ProviderContainer _container(LocationSource src) {
  final c = ProviderContainer(
      overrides: [locationSourceProvider.overrideWithValue(src)]);
  c.listen(navigationProvider, (_, _) {}); // keep the autoDispose provider alive
  addTearDown(c.dispose);
  return c;
}

/// Real timers drive the simulator; poll instead of guessing a fixed delay.
Future<void> _untilArrived(ProviderContainer c) async {
  for (var i = 0; i < 200; i++) {
    if (c.read(navigationProvider).phase == NavPhase.arrived) return;
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

void main() {
  const fast = SimulatedLocationSource(
      speedKmh: 3.6e7, tick: Duration(milliseconds: 2));

  test('start navigates, then arrives at the last route point', () async {
    final c = _container(fast);
    c.read(navigationProvider.notifier).start(const [_a, _b, _c]);
    expect(c.read(navigationProvider).phase, NavPhase.navigating);

    await _untilArrived(c);
    final s = c.read(navigationProvider);
    expect(s.phase, NavPhase.arrived);
    expect(s.position!.point, _c);
    expect(s.progress, closeTo(1, 0.001));
  });

  test('end mid-drive resets to idle and stops emitting', () async {
    final c = _container(const SimulatedLocationSource(
        speedKmh: 3.6e6, tick: Duration(milliseconds: 5)));
    final n = c.read(navigationProvider.notifier)..start(const [_a, _b, _c]);
    await Future<void>.delayed(const Duration(milliseconds: 30));
    n.end();
    expect(c.read(navigationProvider).phase, NavPhase.idle);
    expect(c.read(navigationProvider).position, isNull);
    await Future<void>.delayed(const Duration(milliseconds: 80));
    expect(c.read(navigationProvider).phase, NavPhase.idle);
  });

  test('starting twice does not open a second stream', () async {
    final src = _Counting();
    final c = _container(src);
    final n = c.read(navigationProvider.notifier);
    n.start(const [_a, _b, _c]);
    n.start(const [_a, _b, _c]);
    expect(src.calls, 1);
    n.end();
  });

  test('a one-point route arrives straight away', () async {
    final c = _container(fast);
    c.read(navigationProvider.notifier).start(const [_a]);
    await _untilArrived(c);
    expect(c.read(navigationProvider).phase, NavPhase.arrived);
  });
}
