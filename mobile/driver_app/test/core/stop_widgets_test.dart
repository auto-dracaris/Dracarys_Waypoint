import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/app_button.dart';
import 'package:driver_app/core/widgets/back_bar.dart';
import 'package:driver_app/core/widgets/detail_row.dart';
import 'package:driver_app/core/widgets/label_chip.dart';
import 'package:driver_app/core/widgets/map_view.dart';
import 'package:driver_app/core/widgets/quantity_stepper.dart';
import 'package:driver_app/core/widgets/stop_progress.dart';
import 'package:driver_app/core/widgets/trip_header_bar.dart';
import 'package:driver_app/core/widgets/vehicle_row.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

Widget wrap(Widget child, {List<Override> overrides = const []}) =>
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(theme: AppTheme.light, home: Scaffold(body: child)),
    );

void main() {
  group('AppButton', () {
    testWidgets('fires onPressed for every variant', (tester) async {
      for (final variant in AppButtonVariant.values) {
        var taps = 0;
        await tester.pumpWidget(wrap(AppButton(
            label: 'Go', variant: variant, onPressed: () => taps++)));
        await tester.tap(find.text('Go'));
        expect(taps, 1, reason: '$variant');
      }
    });

    testWidgets('shows leading and trailing icons', (tester) async {
      await tester.pumpWidget(wrap(AppButton(
        label: 'Go',
        variant: AppButtonVariant.outlined,
        leadingIcon: Icons.send_rounded,
        trailingIcon: Icons.arrow_forward_rounded,
        onPressed: () {},
      )));
      expect(find.byIcon(Icons.send_rounded), findsOneWidget);
      expect(find.byIcon(Icons.arrow_forward_rounded), findsOneWidget);
    });

    testWidgets('is inert while loading or when onPressed is null',
        (tester) async {
      var taps = 0;
      await tester.pumpWidget(
          wrap(AppButton(label: 'Go', isLoading: true, onPressed: () => taps++)));
      await tester.tap(find.byType(AppButton), warnIfMissed: false);
      expect(taps, 0);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpWidget(wrap(const AppButton(label: 'Go', onPressed: null)));
      await tester.tap(find.text('Go'), warnIfMissed: false);
      expect(taps, 0);
    });
  });

  testWidgets('BackBar shows the label and reports taps', (tester) async {
    var back = 0;
    await tester.pumpWidget(wrap(BackBar(onBack: () => back++)));
    expect(find.text('My trips'), findsOneWidget);
    await tester.tap(find.byKey(const Key('back-bar-button')));
    expect(back, 1);
  });

  testWidgets('VehicleRow shows the plate and follows connectivity',
      (tester) async {
    await tester.pumpWidget(wrap(const VehicleRow(plate: 'VEH021')));
    expect(find.text('VEH021'), findsOneWidget);
    expect(find.text('Online'), findsOneWidget);

    final container =
        ProviderScope.containerOf(tester.element(find.byType(VehicleRow)));
    container.read(onlineProvider.notifier).toggle();
    await tester.pump();
    expect(find.text('Offline'), findsOneWidget);
  });

  group('StopProgress', () {
    testWidgets('shows the count and opens all stops', (tester) async {
      var opened = 0;
      await tester.pumpWidget(wrap(
          StopProgress(completed: 2, total: 4, onAllStops: () => opened++)));
      expect(find.text('2 of 4 stops completed'), findsOneWidget);
      await tester.tap(find.text('All stops'));
      expect(opened, 1);
    });

    testWidgets('has two markers per stop', (tester) async {
      await tester.pumpWidget(
          wrap(StopProgress(completed: 1, total: 3, onAllStops: () {})));
      expect(
          find.byWidgetPredicate((w) =>
              w.key is ValueKey<String> &&
              (w.key as ValueKey<String>).value.startsWith('progress-marker')),
          findsNWidgets(6));
    });

    testWidgets('fill follows completed / total and never overflows',
        (tester) async {
      await tester.pumpWidget(SizedBox(
          width: 400,
          child: wrap(StopProgress(completed: 2, total: 4, onAllStops: () {}))));
      final half = tester.getSize(find.byKey(const Key('progress-fill'))).width;
      final track = tester.getSize(find.byKey(const Key('progress-track'))).width;
      expect(half / track, closeTo(0.5, 0.01));

      // More completed than total, or zero stops, must not break layout.
      await tester.pumpWidget(
          wrap(StopProgress(completed: 9, total: 4, onAllStops: () {})));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(
          wrap(StopProgress(completed: 0, total: 0, onAllStops: () {})));
      expect(tester.takeException(), isNull);
    });
  });

  group('StopProgress stepper style', () {
    testWidgets('marks completed, current and upcoming stops', (tester) async {
      await tester.pumpWidget(wrap(StopProgress(
          completed: 2,
          total: 4,
          style: StopProgressStyle.stepper,
          onAllStops: () {})));

      expect(find.text('2 of 4 stops completed'), findsOneWidget);
      expect(find.text('✓'), findsNWidgets(2));
      expect(find.text('3'), findsOneWidget); // current
      expect(find.text('4'), findsOneWidget); // upcoming
      expect(find.text('1'), findsNothing);
    });

    testWidgets('a finished trip shows only ticks', (tester) async {
      await tester.pumpWidget(wrap(StopProgress(
          completed: 3,
          total: 3,
          style: StopProgressStyle.stepper,
          onAllStops: () {})));
      expect(find.text('✓'), findsNWidgets(3));
    });
  });

  testWidgets('TripHeaderBar shows back link, plate and connectivity',
      (tester) async {
    var back = 0;
    await tester.pumpWidget(
        wrap(TripHeaderBar(plate: 'VEH021', onBack: () => back++)));
    expect(find.text('VEH021'), findsOneWidget);
    expect(find.text('Online'), findsOneWidget);
    await tester.tap(find.byKey(const Key('back-bar-button')));
    expect(back, 1);
  });

  testWidgets('AppButton bold + roomy padding option renders', (tester) async {
    await tester.pumpWidget(wrap(AppButton(
      label: 'Continue',
      bold: true,
      padding: 14,
      trailingIcon: Icons.arrow_forward_rounded,
      onPressed: () {},
    )));
    expect(find.text('Continue'), findsOneWidget);
  });

  testWidgets('DetailRow shows its icon and content', (tester) async {
    await tester.pumpWidget(wrap(const DetailRow(
        icon: Icons.warehouse_rounded, child: Text('Rear loading dock'))));
    expect(find.byIcon(Icons.warehouse_rounded), findsOneWidget);
    expect(find.text('Rear loading dock'), findsOneWidget);
  });

  testWidgets('InfoTile-style label chips render their text', (tester) async {
    await tester.pumpWidget(wrap(const LabelChip(
      label: 'Chilled',
      icon: Icons.ac_unit,
      background: Color(0xFFDBEAFE),
      foreground: Color(0xFF1D4ED8),
    )));
    expect(find.text('Chilled'), findsOneWidget);
    expect(find.byIcon(Icons.ac_unit), findsOneWidget);
  });

  group('QuantityStepper', () {
    testWidgets('increments and decrements within bounds', (tester) async {
      var value = 5;
      await tester.pumpWidget(wrap(StatefulBuilder(
        builder: (context, setState) => QuantityStepper(
          value: value,
          min: 4,
          max: 6,
          onChanged: (v) => setState(() => value = v),
        ),
      )));

      await tester.tap(find.byKey(const Key('stepper-plus')));
      await tester.pump();
      expect(find.text('6'), findsOneWidget);

      // At the maximum the plus button does nothing.
      await tester.tap(find.byKey(const Key('stepper-plus')));
      await tester.pump();
      expect(value, 6);

      await tester.tap(find.byKey(const Key('stepper-minus')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('stepper-minus')));
      await tester.pump();
      expect(value, 4);

      await tester.tap(find.byKey(const Key('stepper-minus')));
      await tester.pump();
      expect(value, 4); // never below min
    });
  });

  testWidgets('MapView renders markers and a route without network tiles',
      (tester) async {
    await tester.pumpWidget(wrap(
      SizedBox(
        height: 300,
        child: MapView(
          center: const LatLng(7.07, 79.89),
          markers: const [
            MapMarker(
                point: LatLng(7.07, 79.89), child: Icon(Icons.location_on))
          ],
          route: const [LatLng(7.0, 79.9), LatLng(7.07, 79.89)],
        ),
      ),
      overrides: [mapTilesEnabledProvider.overrideWithValue(false)],
    ));
    await tester.pump();
    expect(find.byIcon(Icons.location_on), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
