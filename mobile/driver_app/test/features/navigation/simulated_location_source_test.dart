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
        demoDuration: Duration(milliseconds: 10),
        tick: Duration(milliseconds: 1));
    final out = await src.follow(const [a]).toList();
    expect(out, hasLength(1));
    expect(out.single.remainingMeters, 0);
  });

  test('source runs from start to end with decreasing remaining distance',
      () async {
    const src = SimulatedLocationSource(
        demoDuration: Duration(milliseconds: 20),
        tick: Duration(milliseconds: 2));
    final out = await src.follow(const [a, b, c]).toList();
    expect(out.first.point, a);
    expect(out.last.point, c);
    expect(out.last.remainingMeters, 0);
    for (var i = 1; i < out.length; i++) {
      expect(out[i].remainingMeters,
          lessThanOrEqualTo(out[i - 1].remainingMeters));
    }
  });
}
