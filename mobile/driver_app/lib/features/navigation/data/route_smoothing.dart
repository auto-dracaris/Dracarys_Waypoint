import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

const _metersPerDegree = 111320.0;

/// Replaces each sharp corner of [route] with a smooth arc about
/// [radiusMeters] wide, so something walking the route turns like a vehicle
/// instead of snapping at the vertex. The first and last points are kept as
/// they are, near-straight vertices are left alone, and on short segments the
/// arc shrinks so it never crosses its neighbours.
///
/// Draw the returned path and walk the returned path: the van is then always
/// exactly on the line and pointing along it.
List<LatLng> roundCorners(
  List<LatLng> route, {
  double radiusMeters = 10,
  int steps = 8,
}) {
  const distance = Distance();
  final pts = <LatLng>[];
  for (final p in route) {
    if (pts.isEmpty || distance(pts.last, p) > 0) pts.add(p);
  }
  if (pts.length < 3) return pts;

  final out = <LatLng>[pts.first];
  for (var i = 1; i < pts.length - 1; i++) {
    final corner = _corner(pts[i - 1], pts[i], pts[i + 1], radiusMeters, steps);
    out.addAll(corner ?? [pts[i]]);
  }
  out.add(pts.last);
  return out;
}

/// The arc replacing vertex [p] between [a] and [b], or null to keep it as is.
List<LatLng>? _corner(LatLng a, LatLng p, LatLng b, double radius, int steps) {
  final mLng = _metersPerDegree * math.cos(p.latitude * math.pi / 180);

  (double, double) toLocal(LatLng q) => (
    (q.longitude - p.longitude) * mLng,
    (q.latitude - p.latitude) * _metersPerDegree,
  );

  final (ax, ay) = toLocal(a);
  final (bx, by) = toLocal(b);
  final l1 = math.sqrt(ax * ax + ay * ay);
  final l2 = math.sqrt(bx * bx + by * by);
  if (l1 == 0 || l2 == 0) return null;

  final u1 = (ax / l1, ay / l1), u2 = (bx / l2, by / l2);
  final cosInterior = (u1.$1 * u2.$1 + u1.$2 * u2.$2).clamp(-1.0, 1.0);
  final interior = math.acos(cosInterior);
  final deflection = math.pi - interior;
  if (deflection < 3 * math.pi / 180) return null; // already straight

  // Distance from the vertex to where the arc starts and ends on each leg.
  final t = math.min(radius / math.tan(interior / 2), 0.45 * math.min(l1, l2));

  final q1 = (u1.$1 * t, u1.$2 * t);
  final q2 = (u2.$1 * t, u2.$2 * t);

  LatLng toLatLng(double x, double y) =>
      LatLng(p.latitude + y / _metersPerDegree, p.longitude + x / mLng);

  // Quadratic Bezier q1 -> vertex -> q2 hugs the corner like a turning vehicle.
  return [
    for (var k = 0; k <= steps; k++)
      () {
        final s = k / steps, r = 1 - s;
        final x = r * r * q1.$1 + s * s * q2.$1;
        final y = r * r * q1.$2 + s * s * q2.$2;
        return toLatLng(x, y);
      }(),
  ];
}

/// Limits how fast a compass heading may change, always turning the short way
/// round (350 to 10 is a 20 degree turn, not 340).
class HeadingSmoother {
  HeadingSmoother({this.maxDegreesPerSecond = 120});

  final double maxDegreesPerSecond;
  double? _heading;

  double step(double target, double dtSeconds) {
    final current = _heading;
    if (current == null) return _heading = target;

    var diff = ((target - current + 540) % 360) - 180; // -180..180
    if (diff <= -180) diff = 180; // a full reversal turns the same way each time
    final maxStep = maxDegreesPerSecond * dtSeconds;
    if (diff.abs() <= maxStep) return _heading = (target % 360 + 360) % 360;
    return _heading = ((current + maxStep * diff.sign) % 360 + 360) % 360;
  }
}
