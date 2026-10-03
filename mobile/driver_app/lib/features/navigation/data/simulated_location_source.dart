import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

import 'location_source.dart';
import 'route_smoothing.dart';

// Unrounded: the default rounds every result to whole metres, which wrecks the
// sub-metre segments of a corner arc.
const _dist = Distance(roundResult: false);

/// Walks a polyline by distance, giving the point and heading at any offset.
class PolylineWalker {
  PolylineWalker(List<LatLng> route) {
    for (final p in route) {
      // OSRM can repeat points; zero-length segments have no heading.
      if (_pts.isEmpty || _dist(_pts.last, p) > 0) _pts.add(p);
    }
    var acc = 0.0;
    _cum.add(0);
    for (var i = 1; i < _pts.length; i++) {
      acc += _dist(_pts[i - 1], _pts[i]);
      _cum.add(acc);
    }
    totalMeters = acc;
  }

  final _pts = <LatLng>[];
  final _cum = <double>[];
  late final double totalMeters;

  /// Heading is measured between points this far behind and ahead of the
  /// vehicle, so turns blend in over a few metres instead of snapping at each
  /// polyline vertex.
  static const _headingWindowMeters = 12.5;

  /// Point at [m] metres along the route, and the heading of its segment.
  (LatLng, double) _locate(double m) {
    var i = 1;
    while (i < _cum.length - 1 && _cum[i] < m) {
      i++;
    }
    final seg = _cum[i] - _cum[i - 1];
    final t = seg == 0 ? 0.0 : (m - _cum[i - 1]) / seg;
    final from = _pts[i - 1], to = _pts[i];
    final point = LatLng(
      from.latitude + (to.latitude - from.latitude) * t,
      from.longitude + (to.longitude - from.longitude) * t,
    );
    return (point, (_dist.bearing(from, to) + 360) % 360);
  }

  VehiclePosition at(double meters) {
    if (_pts.length < 2) {
      return VehiclePosition(
        point: _pts.isEmpty ? const LatLng(0, 0) : _pts.first,
        heading: 0,
        speedKmh: 0,
        remainingMeters: 0,
      );
    }
    final m = meters.clamp(0.0, totalMeters).toDouble();
    final (point, segmentHeading) = _locate(m);
    final (behind, _) = _locate(math.max(m - _headingWindowMeters, 0));
    final (ahead, _) = _locate(math.min(m + _headingWindowMeters, totalMeters));
    final heading = _dist(behind, ahead) < 1
        ? segmentHeading
        : (_dist.bearing(behind, ahead) + 360) % 360;
    return VehiclePosition(
      point: m >= totalMeters ? _pts.last : point,
      heading: heading,
      speedKmh: 0,
      remainingMeters: totalMeters - m,
    );
  }
}

/// Drives the route at a steady [speedKmh]. Position is speed x elapsed time,
/// not speed x tick count: timers fire late when the app janks, and a fixed
/// step per tick would make the van speed up and slow down. [elapsed] is the
/// clock (defaults to a stopwatch started at the first position), injectable
/// so tests can script jank. The heading never turns faster than
/// [maxTurnDegreesPerSecond].
class SimulatedLocationSource implements LocationSource {
  const SimulatedLocationSource({
    this.speedKmh = 45,
    this.tick = const Duration(milliseconds: 33),
    this.elapsed,
    this.maxTurnDegreesPerSecond = 120,
  });

  final double speedKmh;
  final Duration tick;
  final Duration Function()? elapsed;
  final double maxTurnDegreesPerSecond;

  @override
  Stream<VehiclePosition> follow(List<LatLng> route) async* {
    final walker = PolylineWalker(route);
    final stopwatch = Stopwatch()..start();
    final clock = elapsed ?? () => stopwatch.elapsed;
    final smoother = HeadingSmoother(maxDegreesPerSecond: maxTurnDegreesPerSecond);
    var lastTime = clock();

    VehiclePosition at(double m, Duration now) {
      final dt = (now - lastTime).inMicroseconds / 1e6;
      lastTime = now;
      final p = walker.at(m);
      return VehiclePosition(
        point: p.point,
        heading: smoother.step(p.heading, dt),
        speedKmh: p.remainingMeters == 0 ? 0 : speedKmh,
        remainingMeters: p.remainingMeters,
      );
    }

    yield at(0, lastTime);
    if (walker.totalMeters == 0) return;
    final metersPerSecond = speedKmh / 3.6;
    final start = lastTime;
    var m = 0.0;
    while (m < walker.totalMeters) {
      await Future<void>.delayed(tick);
      final t = clock();
      m = math.min(
          walker.totalMeters, metersPerSecond * (t - start).inMicroseconds / 1e6);
      yield at(m, t);
    }
  }
}
