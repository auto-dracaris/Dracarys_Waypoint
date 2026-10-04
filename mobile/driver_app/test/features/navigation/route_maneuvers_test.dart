import 'package:driver_app/features/navigation/data/route_maneuvers.dart';
import 'package:driver_app/features/navigation/data/route_smoothing.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

const _dist = Distance(roundResult: false);

/// Walks [legs] (heading degrees, metres) from [start].
List<LatLng> _path(
  List<(double, double)> legs, {
  LatLng start = const LatLng(7.0, 80.0),
}) {
  final pts = [start];
  for (final (heading, metres) in legs) {
    pts.add(_dist.offset(pts.last, metres, heading));
  }
  return pts;
}

void main() {
  test('a straight road has no turns', () {
    expect(findManeuvers(_path([(90, 400), (90, 300)])), isEmpty);
  });

  test('finds a right turn about where the corner is', () {
    final route = roundCorners(_path([(0, 300), (90, 300)]));
    final m = findManeuvers(route);
    expect(m, hasLength(1));
    expect(m.single.kind, TurnKind.right);
    expect(m.single.atMeters, closeTo(300, 15));
  });

  test('finds a left turn', () {
    final route = roundCorners(_path([(0, 200), (270, 200)]));
    expect(findManeuvers(route).single.kind, TurnKind.left);
  });

  test('a gentle bend is a slight turn, a hairpin a sharp one', () {
    final slight = roundCorners(_path([(0, 300), (50, 300)]), radiusMeters: 30);
    expect(findManeuvers(slight).single.kind, TurnKind.slightRight);
    final sharp = roundCorners(_path([(0, 300), (140, 300)]));
    expect(findManeuvers(sharp).single.kind, TurnKind.sharpRight);
  });

  test('two turns come back in order', () {
    final route = roundCorners(_path([(0, 200), (90, 200), (0, 200)]));
    final m = findManeuvers(route);
    expect(m.map((e) => e.kind), [TurnKind.right, TurnKind.left]);
    expect(m.first.atMeters, lessThan(m.last.atMeters));
  });

  test('nextManeuver skips turns already passed', () {
    const all = [Maneuver(TurnKind.left, 100), Maneuver(TurnKind.right, 400)];
    expect(nextManeuver(all, 0)!.atMeters, 100);
    expect(nextManeuver(all, 150)!.atMeters, 400);
    expect(nextManeuver(all, 0, skip: 1)!.atMeters, 400);
    expect(nextManeuver(all, 395), isNull);
  });
}
