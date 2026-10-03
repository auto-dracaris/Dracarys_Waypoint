import 'package:driver_app/core/widgets/map_mode.dart';
import 'package:driver_app/features/navigation/presentation/navigation_preview_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const van = LatLng(7.0, 80.0);
  const dist = Distance();

  test('tilted follow is closer and looks ahead of the van along its heading',
      () {
    final t = followTarget(van, 90, MapMode.tilted);
    expect(t.zoom, 21.5);
    expect(t.pitch, 70);
    expect(t.bearing, 90);
    expect(dist(van, t.point), closeTo(5, 0.2));
    expect((dist.bearing(van, t.point) + 360) % 360, closeTo(90, 0.5));
  });

  test('flat follow stays centred on the van', () {
    final t = followTarget(van, 90, MapMode.flat);
    expect(t.point, van);
    expect(t.zoom, 18.5);
  });
}
