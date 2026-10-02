import 'dart:math' as math;

import 'package:driver_app/features/navigation/presentation/widgets/vehicle_marker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  double rotationOf(WidgetTester tester) {
    final t = tester.widget<Transform>(find.descendant(
        of: find.byKey(const Key('vehicle-marker')),
        matching: find.byType(Transform)));
    final m = t.transform.storage;
    return math.atan2(m[1], m[0]);
  }

  testWidgets('rotates to the heading', (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Center(child: VehicleMarker(heading: 90))));
    expect(find.byKey(const Key('vehicle-marker')), findsOneWidget);
    expect(rotationOf(tester), closeTo(math.pi / 2, 0.001));
  });

  testWidgets('heading 0 is upright', (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Center(child: VehicleMarker(heading: 0))));
    expect(rotationOf(tester), closeTo(0, 0.001));
  });
}
