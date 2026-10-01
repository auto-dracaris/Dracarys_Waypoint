// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_application/main.dart';

void main() {
  testWidgets('loads a trip and returns to the trip list', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const TripsApp());

    expect(find.text('Trips to load'), findsOneWidget);
    expect(find.text('VEH014 · Trip 1'), findsOneWidget);

    await tester.tap(find.text('Start loading'));
    await tester.pumpAndSettle();

    expect(find.text('Load in reverse stop order'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Begin loading'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Begin loading'), findsOneWidget);
  });
}
