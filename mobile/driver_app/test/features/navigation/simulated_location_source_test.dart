import 'dart:math' as math;

import 'package:driver_app/features/navigation/data/simulated_location_source.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  // An L: ~1 km north, then ~1 km east.
  const a = LatLng(6.0, 80.0);
  const b = LatLng(6.009, 80.0);
  const c = LatLng(6.009, 80.009);

  test('walker heading is north on the first leg and east on the second', () {
    final w = PolylineWalker(const [a, b, c]);
    expect(w.at(10).heading, closeTo(0, 1));
    expect(w.at(w.totalMeters - 10).heading, closeTo(90, 1));
  });

  test('heading turns gradually through a corner instead of snapping', () {
    final w = PolylineWalker(const [a, b, c]);
    final corner = w.totalMeters / 2;
    final before = w.at(corner - 60).heading;
    final at = w.at(corner).heading;
    final after = w.at(corner + 60).heading;
    expect(before, closeTo(0, 1));
    expect(at, inInclusiveRange(20, 70));
    expect(after, closeTo(90, 1));
  });

  test('walker clamps to the ends and reports remaining distance', () {
    final w = PolylineWalker(const [a, b, c]);
    expect(w.at(-5).remainingMeters, closeTo(w.totalMeters, 0.001));
    expect(w.at(1e9).point, c);
    expect(w.at(1e9).remainingMeters, 0);
  });

  test('duplicate points do not produce NaN', () {
    final w = PolylineWalker(const [a, a, b, b]);
    expect(w.at(w.totalMeters / 2).heading.isNaN, isFalse);
  });

  test('a route with fewer than two points yields one position', () async {
    const src = SimulatedLocationSource(
        speedKmh: 3.6e7, tick: Duration(milliseconds: 1));
    final out = await src.follow(const [a]).toList();
    expect(out, hasLength(1));
    expect(out.single.remainingMeters, 0);
  });

  test('source runs from start to end with decreasing remaining distance',
      () async {
    const src = SimulatedLocationSource(
        speedKmh: 3.6e7, tick: Duration(milliseconds: 2));
    final out = await src.follow(const [a, b, c]).toList();
    expect(out.first.point, a);
    expect(out.last.point, c);
    expect(out.last.remainingMeters, 0);
    for (var i = 1; i < out.length; i++) {
      expect(out[i].remainingMeters,
          lessThanOrEqualTo(out[i - 1].remainingMeters));
    }
  });

  test('distance follows the clock, not the tick count (a janky frame catches up)',
      () async {
    // 36 km/h = 10 m/s. Scripted clock: 0 ms, 10 ms, then a 100 ms hiccup.
    final times = [0, 10, 110, 120, 1000000];
    var i = 0;
    final src = SimulatedLocationSource(
      speedKmh: 36,
      tick: const Duration(milliseconds: 1),
      elapsed: () => Duration(milliseconds: times[math.min(i++, times.length - 1)]),
    );
    final out = await src.follow(const [a, b, c]).take(5).toList();
    final travelled = [
      for (final p in out) out.first.remainingMeters - p.remainingMeters
    ];
    expect(travelled[1], closeTo(0.1, 1e-6)); // 10 ms * 10 m/s
    expect(travelled[2], closeTo(1.1, 1e-6)); // jumps with the clock
    expect(travelled[3], closeTo(1.2, 1e-6));
  });

  test('heading never swings faster than the turn-rate limit', () async {
    // A U-turn: north then straight back south (180 degree reversal).
    const north = LatLng(6.0009, 80.0);
    final src = SimulatedLocationSource(
      speedKmh: 180, // 50 m/s: 5 m per 100 ms step, so the reversal comes mid-run
      tick: const Duration(milliseconds: 1),
      elapsed: _steadyClock(const Duration(milliseconds: 100)),
      maxTurnDegreesPerSecond: 90,
    );
    final out = await src.follow(const [a, north, a]).take(30).toList();
    var worst = 0.0;
    for (var k = 1; k < out.length; k++) {
      var d = (out[k].heading - out[k - 1].heading).abs();
      if (d > 180) d = 360 - d;
      expect(d, lessThanOrEqualTo(9.0001)); // 90 deg/s * 0.1 s
      worst = math.max(worst, d);
    }
    expect(worst, greaterThan(8.9)); // the limiter really was doing the work
  });
}

/// A clock that advances by [step] every time it is read.
Duration Function() _steadyClock(Duration step) {
  var t = Duration.zero;
  return () {
    final now = t;
    t += step;
    return now;
  };
}
