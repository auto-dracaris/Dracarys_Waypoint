import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/async_value_view.dart';
import 'package:driver_app/core/widgets/primary_button.dart';
import 'package:driver_app/core/widgets/status_pill.dart';
import 'package:driver_app/core/widgets/waypoint_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget child) =>
    MaterialApp(theme: AppTheme.light, home: Scaffold(body: child));

void main() {
  testWidgets('StatusPill shows label and reports long press', (tester) async {
    var pressed = false;
    await tester.pumpWidget(wrap(StatusPill(
      label: 'Online',
      kind: StatusKind.success,
      onLongPress: () => pressed = true,
    )));
    expect(find.text('Online'), findsOneWidget);
    await tester.longPress(find.text('Online'));
    expect(pressed, isTrue);
  });

  testWidgets('PrimaryButton calls onPressed', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
        wrap(PrimaryButton(label: 'Go', onPressed: () => taps++)));
    await tester.tap(find.text('Go'));
    expect(taps, 1);
  });

  testWidgets('PrimaryButton ignores taps while loading', (tester) async {
    var taps = 0;
    await tester.pumpWidget(wrap(
        PrimaryButton(label: 'Go', isLoading: true, onPressed: () => taps++)));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byType(PrimaryButton), warnIfMissed: false);
    expect(taps, 0);
  });

  testWidgets('AsyncValueView renders data, loading, error and empty',
      (tester) async {
    await tester.pumpWidget(wrap(AsyncValueView<int>(
        value: const AsyncData(7), data: (v) => Text('v$v'))));
    expect(find.text('v7'), findsOneWidget);

    await tester.pumpWidget(wrap(AsyncValueView<int>(
        value: const AsyncLoading<int>(), data: (v) => Text('v$v'))));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    var retried = false;
    await tester.pumpWidget(wrap(AsyncValueView<int>(
      value: AsyncError<int>(Exception('x'), StackTrace.empty),
      data: (v) => Text('v$v'),
      onRetry: () => retried = true,
    )));
    expect(find.text('Something went wrong'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(retried, isTrue);

    await tester.pumpWidget(wrap(AsyncValueView<List<int>>(
      value: const AsyncData(<int>[]),
      data: (v) => Text('n${v.length}'),
      isEmpty: (v) => v.isEmpty,
      emptyMessage: 'No trips',
    )));
    expect(find.text('No trips'), findsOneWidget);
  });

  testWidgets('WaypointLogo renders', (tester) async {
    await tester.pumpWidget(wrap(const WaypointLogo()));
    expect(find.byKey(const Key('waypoint-logo')), findsOneWidget);
  });
}
