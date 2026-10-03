import 'package:driver_app/core/widgets/camera_target.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const p = LatLng(7, 80);

  test('equal targets compare equal', () {
    expect(const CameraTarget(point: p, bearing: 10, zoom: 16, pitch: 60),
        const CameraTarget(point: p, bearing: 10, zoom: 16, pitch: 60));
    expect(const CameraTarget(point: p).hashCode,
        const CameraTarget(point: p).hashCode);
  });

  test('different bearing or point differ', () {
    expect(const CameraTarget(point: p, bearing: 10) ==
        const CameraTarget(point: p, bearing: 11), isFalse);
    expect(const CameraTarget(point: p) ==
        const CameraTarget(point: LatLng(7.1, 80)), isFalse);
  });
}
