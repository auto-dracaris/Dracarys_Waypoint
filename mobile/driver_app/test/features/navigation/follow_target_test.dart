import 'package:driver_app/core/widgets/map_mode.dart';
import 'package:driver_app/features/navigation/presentation/navigation_preview_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const van = LatLng(7.0, 80.0);
  const dist = Distance(roundResult: false);

  test(
    'tilted follow is closer and looks ahead of the van along its heading',
    () {
      final t = followTarget(van, 90, MapMode.tilted);
      expect(t.zoom, 19.5);
      expect(t.pitch, 65);
      expect(t.bearing, 90);
      expect(dist(van, t.point), closeTo(6, 0.1));
      expect((dist.bearing(van, t.point) + 360) % 360, closeTo(90, 0.5));
    },
  );

  test('flat follow also turns with the van and looks ahead of it', () {
    final t = followTarget(van, 90, MapMode.flat);
    expect(t.bearing, 90); // the map turns so the road ahead is up
    expect(t.pitch, 0); // ...but is seen from straight above
    expect(t.zoom, 18.5);
    expect(dist(van, t.point), closeTo(30, 0.1));
    expect((dist.bearing(van, t.point) + 360) % 360, closeTo(90, 0.5));
  });

  test('both modes follow the heading as it changes', () {
    for (final mode in MapMode.values) {
      expect(followTarget(van, 0, mode).bearing, 0);
      expect(followTarget(van, 135, mode).bearing, 135);
      expect(followTarget(van, 270, mode).bearing, 270);
    }
  });
}
