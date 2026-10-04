import 'package:latlong2/latlong.dart';

import 'simulated_location_source.dart';

enum TurnKind {
  slightLeft,
  left,
  sharpLeft,
  slightRight,
  right,
  sharpRight,
  uTurn,
}

extension TurnKindText on TurnKind {
  bool get isLeft =>
      this == TurnKind.slightLeft ||
      this == TurnKind.left ||
      this == TurnKind.sharpLeft ||
      this == TurnKind.uTurn;

  String get label => switch (this) {
    TurnKind.slightLeft => 'Bear left',
    TurnKind.left => 'Turn left',
    TurnKind.sharpLeft => 'Sharp left',
    TurnKind.slightRight => 'Bear right',
    TurnKind.right => 'Turn right',
    TurnKind.sharpRight => 'Sharp right',
    TurnKind.uTurn => 'Make a U-turn',
  };
}

/// A turn on the route: [kind] happens [atMeters] along the line.
class Maneuver {
  const Maneuver(this.kind, this.atMeters);

  final TurnKind kind;
  final double atMeters;
}

const _dist = Distance(roundResult: false);

/// Finds the turns along [route] from its geometry alone (the API returns road
/// shape, not instructions). The line is sampled every [stepMeters]; a turn is
/// a run of samples whose heading keeps changing, and it counts once the run
/// has swung the heading by at least [minDegrees]. Gentle bends that curve a
/// little at a time are summed, so a long sweeping corner is still one turn.
List<Maneuver> findManeuvers(
  List<LatLng> route, {
  double stepMeters = 5,
  double minDegrees = 35,
}) {
  final walker = PolylineWalker(route);
  final total = walker.totalMeters;
  if (total < stepMeters * 3) return const [];

  final n = (total / stepMeters).floor();
  final pts = [for (var i = 0; i <= n; i++) walker.at(i * stepMeters).point];
  final bearings = [
    for (var i = 1; i < pts.length; i++)
      (_dist.bearing(pts[i - 1], pts[i]) + 360) % 360,
  ];

  double delta(double from, double to) => ((to - from + 540) % 360) - 180;

  final out = <Maneuver>[];
  var runStart = -1;
  var runSum = 0.0;
  var quiet = 0;

  void close(int endIndex) {
    if (runStart >= 0 && runSum.abs() >= minDegrees) {
      final mid = (runStart + endIndex) / 2 * stepMeters + stepMeters;
      out.add(Maneuver(_kindFor(runSum), mid.clamp(0, total).toDouble()));
    }
    runStart = -1;
    runSum = 0;
    quiet = 0;
  }

  for (var i = 1; i < bearings.length; i++) {
    final d = delta(bearings[i - 1], bearings[i]);
    if (d.abs() >= 1.2) {
      if (runStart < 0) runStart = i;
      // A change of side inside one run is a new turn, not a correction.
      if (runSum != 0 && d.sign != runSum.sign && runSum.abs() >= minDegrees) {
        close(i - 1);
        runStart = i;
      }
      runSum += d;
      quiet = 0;
    } else if (runStart >= 0 && ++quiet >= 3) {
      close(i - 3);
    }
  }
  close(bearings.length - 1);
  return out;
}

TurnKind _kindFor(double degrees) {
  final a = degrees.abs();
  final left = degrees < 0;
  if (a >= 150) return TurnKind.uTurn;
  if (a >= 120) return left ? TurnKind.sharpLeft : TurnKind.sharpRight;
  if (a >= 55) return left ? TurnKind.left : TurnKind.right;
  return left ? TurnKind.slightLeft : TurnKind.slightRight;
}

/// The next turn after [alongMeters], or null when the road runs straight to
/// the destination.
Maneuver? nextManeuver(List<Maneuver> all, double alongMeters, {int skip = 0}) {
  var seen = 0;
  for (final m in all) {
    if (m.atMeters > alongMeters + 8) {
      if (seen == skip) return m;
      seen++;
    }
  }
  return null;
}
