import 'package:latlong2/latlong.dart';

import 'location_source.dart';

const _dist = Distance();

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
    return VehiclePosition(
      point: m >= totalMeters ? _pts.last : point,
      heading: (_dist.bearing(from, to) + 360) % 360,
      speedKmh: 0,
      remainingMeters: totalMeters - m,
    );
  }
}

/// Drives the route in [demoDuration] regardless of its length, so a demo
/// doesn't take as long as the real trip would.
class SimulatedLocationSource implements LocationSource {
  const SimulatedLocationSource({
    this.demoDuration = const Duration(seconds: 90),
    this.tick = const Duration(milliseconds: 500),
    this.displaySpeedKmh = 40,
  });

  final Duration demoDuration;
  final Duration tick;
  final double displaySpeedKmh;

  @override
  Stream<VehiclePosition> follow(List<LatLng> route) async* {
    final walker = PolylineWalker(route);
    final steps = (demoDuration.inMicroseconds / tick.inMicroseconds)
        .ceil()
        .clamp(1, 1 << 20);

    VehiclePosition at(double m) {
      final p = walker.at(m);
      return VehiclePosition(
        point: p.point,
        heading: p.heading,
        speedKmh: p.remainingMeters == 0 ? 0 : displaySpeedKmh,
        remainingMeters: p.remainingMeters,
      );
    }

    yield at(0);
    if (walker.totalMeters == 0) return;
    for (var i = 1; i <= steps; i++) {
      await Future<void>.delayed(tick);
      yield at(walker.totalMeters * i / steps);
    }
  }
}
