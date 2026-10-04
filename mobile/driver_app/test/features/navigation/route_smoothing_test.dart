import 'dart:math' as math;

import 'package:driver_app/features/navigation/data/route_smoothing.dart';
import 'package:driver_app/features/navigation/data/simulated_location_source.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

const _dist = Distance(roundResult: false);

double _length(List<LatLng> r) {
  var sum = 0.0;
  for (var i = 1; i < r.length; i++) {
    sum += _dist(r[i - 1], r[i]);
  }
  return sum;
}

/// Largest change of direction between consecutive segments, in degrees.
double _sharpestTurn(List<LatLng> r) {
  var worst = 0.0;
  for (var i = 2; i < r.length; i++) {
    final a = _dist.bearing(r[i - 2], r[i - 1]);
    final b = _dist.bearing(r[i - 1], r[i]);
    var d = (b - a).abs() % 360;
    if (d > 180) d = 360 - d;
    worst = math.max(worst, d);
  }
  return worst;
}

void main() {
  // An L: ~1 km north, then ~1 km east (a hard 90 degree corner).
  const a = LatLng(6.0, 80.0);
  const b = LatLng(6.009, 80.0);
  const c = LatLng(6.009, 80.009);

  group('roundCorners', () {
    test('keeps the first and last points exactly', () {
      final r = roundCorners(const [a, b, c]);
      expect(r.first, a);
      expect(r.last, c);
    });

    test('turns a 90 degree corner into gentle steps', () {
      final r = roundCorners(const [a, b, c], radiusMeters: 10);
      expect(r.length, greaterThan(3));
      expect(_sharpestTurn(r), lessThan(25));
    });

    test('stays close to the original path and its length', () {
      final r = roundCorners(const [a, b, c], radiusMeters: 10);
      expect(_length(r), closeTo(_length(const [a, b, c]), 8));
      for (final p in r) {
        // Never strays further than the radius from the original corner path.
        final nearCorner = _dist(p, b) <= 12;
        final onLegOne = (p.longitude - a.longitude).abs() < 1e-6;
        final onLegTwo = (p.latitude - b.latitude).abs() < 1e-6;
        expect(nearCorner || onLegOne || onLegTwo, isTrue, reason: '$p');
      }
    });

    test('leaves a straight route untouched', () {
      const mid = LatLng(6.0045, 80.0);
      expect(roundCorners(const [a, mid, b]), const [a, mid, b]);
    });

    test('a short segment never overshoots its neighbours', () {
      // ~5 m legs: the arc must shrink instead of crossing the segment.
      const p0 = LatLng(6.0, 80.0);
      const p1 = LatLng(6.00004, 80.0);
      const p2 = LatLng(6.00004, 80.00004);
      final r = roundCorners(const [p0, p1, p2], radiusMeters: 10);
      for (final p in r) {
        expect(p.latitude, inInclusiveRange(6.0, 6.00004 + 1e-9));
        expect(p.longitude, inInclusiveRange(80.0, 80.00004 + 1e-9));
      }
    });

    test('handles tiny routes and duplicate points', () {
      expect(roundCorners(const []), isEmpty);
      expect(roundCorners(const [a]), const [a]);
      expect(roundCorners(const [a, b]), const [a, b]);
      final r = roundCorners(const [a, a, b, b, c, c]);
      expect(r.first, a);
      expect(r.last, c);
      expect(r.every((p) => !p.latitude.isNaN && !p.longitude.isNaN), isTrue);
    });

    test('walking the rounded route turns smoothly with no snap', () {
      final w = PolylineWalker(roundCorners(const [a, b, c], radiusMeters: 10));
      var previous = w.at(0).heading;
      var worstStep = 0.0;
      for (var m = 0.5; m < w.totalMeters; m += 0.5) {
        final h = w.at(m).heading;
        var d = (h - previous).abs();
        if (d > 180) d = 360 - d;
        worstStep = math.max(worstStep, d);
        previous = h;
      }
      // Half a metre of travel never changes heading by more than a few degrees.
      expect(worstStep, lessThan(8));
    });
  });

  group('HeadingSmoother', () {
    test('the first value passes straight through', () {
      expect(HeadingSmoother().step(123, 0.033), 123);
    });

    test('limits how fast the heading can turn', () {
      final s = HeadingSmoother(maxDegreesPerSecond: 120)..step(0, 0.033);
      expect(s.step(180, 0.1), closeTo(12, 1e-9));
    });

    test('snaps onto the target once it is within one step', () {
      final s = HeadingSmoother(maxDegreesPerSecond: 120)..step(0, 0.033);
      expect(s.step(5, 0.1), 5);
    });

    test('turns the short way round north (350 to 10 goes up, not down)', () {
      final s = HeadingSmoother(maxDegreesPerSecond: 120)..step(350, 0.033);
      final next = s.step(10, 0.1);
      expect(next, closeTo(2, 1e-9)); // 350 + 12 = 362 -> 2
    });

    test('turns the short way the other direction too', () {
      final s = HeadingSmoother(maxDegreesPerSecond: 120)..step(10, 0.033);
      expect(s.step(350, 0.1), closeTo(358, 1e-9)); // 10 - 12 = -2 -> 358
    });
  });
}
