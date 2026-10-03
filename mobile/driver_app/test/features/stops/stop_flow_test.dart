import 'package:driver_app/features/navigation/application/navigation_controller.dart';
import 'package:driver_app/features/navigation/data/simulated_location_source.dart';
import 'package:driver_app/features/stops/presentation/delivered_quantities.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

Finder inCard(String orderId, Key key) => find.descendant(
    of: find.byKey(Key('order-card-$orderId')), matching: find.byKey(key));

void main() {
  group('Stop info', () {
    testWidgets('shows the next stop, its tiles, orders and actions',
        (tester) async {
      await pumpTripRoutes(tester, location: stop3);

      expect(find.text('My trips'), findsOneWidget);
      expect(find.text('VEH021'), findsOneWidget);
      expect(find.text('Online'), findsOneWidget);
      expect(find.text('2 of 4 stops completed'), findsOneWidget);
      expect(find.text('All stops'), findsOneWidget);

      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('Delivery window'), findsOneWidget);
      expect(find.text('06:00-08:00'), findsOneWidget);
      expect(find.text('Planned arrival'), findsOneWidget);
      expect(find.text('07:10 AM'), findsOneWidget);
      expect(find.text('Rear loading dock'), findsOneWidget);
      expect(find.text('2 orders'), findsOneWidget);
      expect(find.text('Chilled'), findsOneWidget);
      expect(find.text('Ambient'), findsOneWidget);
      expect(find.text('View orders'), findsOneWidget);
      expect(find.text('Get Directions'), findsOneWidget);
      expect(find.text('Mark arrived'), findsOneWidget);
    });

    testWidgets('View orders expands the list and the header collapses it',
        (tester) async {
      await pumpTripRoutes(tester, location: stop3);

      await tester.tap(find.text('View orders'));
      await tester.pumpAndSettle();
      expect(find.text('ORD-4521'), findsOneWidget);
      expect(find.text('ORD-4522'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela • 12 cases'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela • 8 cases'), findsOneWidget);
      expect(find.text('Pending delivery'), findsNWidgets(2));
      expect(find.text('View orders'), findsNothing);

      await tester.tap(find.byKey(const Key('orders-toggle')));
      await tester.pumpAndSettle();
      expect(find.text('ORD-4521'), findsNothing);
      expect(find.text('View orders'), findsOneWidget);
    });

    testWidgets('the last stop reads "4 of 4" with a singular order',
        (tester) async {
      await pumpTripRoutes(tester, location: stop4);

      expect(find.text('NEXT STOP · 4 OF 4'), findsOneWidget);
      expect(find.text('Lanka Sathosa — Ragama'), findsOneWidget);
      expect(find.text('Check receiving entrance'), findsOneWidget);
      expect(find.text('1 order'), findsOneWidget);
      expect(find.text('Ambient'), findsOneWidget);
      expect(find.text('Chilled'), findsNothing);
    });

    testWidgets('an unknown stop shows an error, not a red screen',
        (tester) async {
      await pumpTripRoutes(tester,
          location: '/trips/trip/trip-1/stop/trip-1-stop-99');
      expect(find.text('Something went wrong'), findsOneWidget);
    });

    testWidgets('an unknown trip shows an error too', (tester) async {
      await pumpTripRoutes(tester,
          location: '/trips/trip/nope/stop/trip-1-stop-3');
      expect(find.text('Something went wrong'), findsOneWidget);
    });

    testWidgets('the back link returns to My trips', (tester) async {
      await pumpTripRoutes(tester, location: stop3);
      await tester.tap(find.byKey(const Key('back-bar-button')));
      await tester.pumpAndSettle();
      expect(find.text('Trips page'), findsOneWidget);
    });

    testWidgets('Mark arrived records the arrival and opens the arrived screen',
        (tester) async {
      await pumpTripRoutes(tester, location: stop3);

      await tester.tap(find.text('Mark arrived'));
      await tester.pumpAndSettle();

      expect(find.text('ARRIVED · STOP 3 OF 4'), findsOneWidget);
      expect(find.text('07:08 AM'), findsOneWidget);
    });
  });

  group('Navigation preview', () {
    testWidgets('shows the route summary, callout and markers',
        (tester) async {
      await pumpTripRoutes(tester, location: stop3);
      await tester.tap(find.text('Get Directions'));
      await tester.pumpAndSettle();

      expect(find.text('Your Location'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('18 min'), findsOneWidget);
      expect(find.text('7.2 km · Estimated arrival 07:10'), findsOneWidget);
      expect(find.text('Start navigation'), findsOneWidget);
      expect(find.text('Route details'), findsOneWidget);

      for (final n in ['1', '2', '3', '4']) {
        expect(find.text(n), findsOneWidget, reason: 'marker $n');
      }
      // Completed stops carry a check badge; upcoming ones don't.
      expect(find.byKey(const Key('marker-check-1')), findsOneWidget);
      expect(find.byKey(const Key('marker-check-2')), findsOneWidget);
      expect(find.byKey(const Key('marker-check-3')), findsNothing);
      expect(find.byKey(const Key('marker-check-4')), findsNothing);
    });

    testWidgets('the 2D/3D toggle switches the map mode', (tester) async {
      await pumpTripRoutes(tester, location: stop3);
      await tester.tap(find.text('Get Directions'));
      await tester.pumpAndSettle();

      expect(find.text('3D'), findsOneWidget);
      await tester.tap(find.byKey(const Key('map-mode-toggle')));
      await tester.pumpAndSettle();
      expect(find.text('2D'), findsOneWidget);
      expect(find.text('3D'), findsNothing);

      await tester.tap(find.byKey(const Key('map-mode-toggle')));
      await tester.pumpAndSettle();
      expect(find.text('3D'), findsOneWidget);
    });

    group('live navigation', () {
      // Widget tests run on fake time, which a real stopwatch cannot see, so
      // the drive reads a scripted clock that moves 20 ms per reading.
      Duration Function() steadyClock() {
        var t = Duration.zero;
        return () {
          final now = t;
          t += const Duration(milliseconds: 20);
          return now;
        };
      }

      final quick = SimulatedLocationSource(
          speedKmh: 2.0e5,
          tick: const Duration(milliseconds: 20),
          elapsed: steadyClock());

      Future<void> openDirections(WidgetTester tester) async {
        await pumpTripRoutes(tester,
            location: stop3,
            overrides: [locationSourceProvider.overrideWithValue(quick)]);
        await tester.tap(find.text('Get Directions'));
        await tester.pumpAndSettle();
      }

      testWidgets('the vehicle sits on the map before navigation starts',
          (tester) async {
        await openDirections(tester);
        expect(find.byKey(const Key('vehicle-marker')), findsOneWidget);
        expect(find.byKey(const Key('live-dot')), findsNothing);
        expect(find.byKey(const Key('locate-button')), findsOneWidget);
      });

      testWidgets('Start drives to arrival and offers the arrived action',
          (tester) async {
        await openDirections(tester);

        await tester.tap(find.text('Start navigation'));
        await tester.pump(const Duration(milliseconds: 60));
        expect(find.text('End navigation'), findsOneWidget);
        expect(find.byKey(const Key('live-dot')), findsOneWidget);
        expect(find.byKey(const Key('vehicle-marker')), findsOneWidget);

        await tester.pumpAndSettle();
        expect(find.text('You have arrived'), findsOneWidget);
        expect(find.text("I've arrived"), findsOneWidget);

        await tester.tap(find.text("I've arrived"));
        await tester.pumpAndSettle();
        expect(find.text('ARRIVED · STOP 3 OF 4'), findsOneWidget);
      });

      testWidgets('End navigation returns to idle', (tester) async {
        await openDirections(tester);
        await tester.tap(find.text('Start navigation'));
        await tester.pump(const Duration(milliseconds: 60));

        await tester.tap(find.text('End navigation'));
        await tester.pumpAndSettle();
        expect(find.text('Start navigation'), findsOneWidget);
        expect(find.byKey(const Key('live-dot')), findsNothing);
      });

      testWidgets('swap flips the callout when idle, not while navigating',
          (tester) async {
        await openDirections(tester);
        double dy(String t) => tester.getTopLeft(find.text(t)).dy;
        const dest = 'Waypoint Fresh — Ja-Ela';
        expect(dy('Your Location'), lessThan(dy(dest)));

        await tester.tap(find.byKey(const Key('swap-button')));
        await tester.pumpAndSettle();
        expect(dy(dest), lessThan(dy('Your Location')));

        await tester.tap(find.byKey(const Key('swap-button')));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Start navigation'));
        await tester.pump(const Duration(milliseconds: 60));
        await tester.tap(find.byKey(const Key('swap-button')));
        await tester.pump();
        expect(dy('Your Location'), lessThan(dy(dest)));
        await tester.pumpAndSettle();
      });

      testWidgets('the locate button can be tapped', (tester) async {
        await openDirections(tester);
        await tester.tap(find.byKey(const Key('locate-button')));
        await tester.pump();
        expect(tester.takeException(), isNull);
      });
    });

    testWidgets('the back link returns to the stop', (tester) async {
      await pumpTripRoutes(tester, location: stop3);
      await tester.tap(find.text('Get Directions'));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('back-bar-button')));
      await tester.pumpAndSettle();
      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
    });
  });

  group('Arrived', () {
    Future<void> pumpArrived(WidgetTester tester) async {
      final repo = testTripsRepository();
      await tester.runAsync(() => repo.markArrived('trip-1'));
      await pumpTripRoutes(tester, location: '$stop3/arrived', trips: repo);
    }

    testWidgets('shows the arrival details, orders and actions',
        (tester) async {
      await pumpArrived(tester);

      expect(find.text('My trips'), findsOneWidget);
      expect(find.text('VEH021'), findsOneWidget);
      expect(find.text('Online'), findsOneWidget);

      // Stepper: two ticks, current 3, upcoming 4.
      expect(find.text('2 of 4 stops completed'), findsOneWidget);
      expect(find.text('✓'), findsNWidgets(2));
      expect(find.text('3'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);

      expect(find.text('ARRIVED · STOP 3 OF 4'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('Delivery window'), findsOneWidget);
      expect(find.text('06:00–08:00'), findsOneWidget);
      expect(find.text('Arrived at'), findsOneWidget);
      expect(find.text('07:08 AM'), findsOneWidget);
      expect(find.text('Rear loading dock'), findsOneWidget);
      expect(find.text('Contact outlet'), findsOneWidget);
      expect(find.text('(when safely stopped)'), findsOneWidget);

      expect(find.text('2 orders'), findsOneWidget);
      expect(find.text('ORD-4521'), findsOneWidget);
      expect(find.text('ORD-4522'), findsOneWidget);
      expect(find.text('12 cases'), findsOneWidget);
      expect(find.text('8 cases'), findsOneWidget);
      expect(find.text('Planned qty'), findsNWidgets(2));
      expect(find.text('Delivered'), findsNWidgets(2));
      expect(find.text('Handling: Keep cold chain intact.'), findsOneWidget);
      expect(
          find.text(
              'Verify quantities match before continuing to proof of delivery.'),
          findsOneWidget);
      expect(find.text('Continue to proof of delivery'), findsOneWidget);
      expect(find.text('Report an issue'), findsOneWidget);
    });

    testWidgets('delivered quantities start at planned and stay within 0..planned',
        (tester) async {
      await pumpArrived(tester);
      final container =
          ProviderScope.containerOf(tester.element(find.text('ORD-4522')));

      // Starts at planned, so plus is inert.
      await tester.tap(inCard('ORD-4522', const Key('stepper-plus')));
      await tester.pump();
      expect(container.read(deliveredQuantitiesProvider)['ORD-4522'] ?? 8, 8);

      await tester.tap(inCard('ORD-4522', const Key('stepper-minus')));
      await tester.pump();
      expect(container.read(deliveredQuantitiesProvider)['ORD-4522'], 7);
      expect(
          find.descendant(
              of: find.byKey(const Key('order-card-ORD-4522')),
              matching: find.text('7')),
          findsOneWidget);

      // The other order is untouched.
      expect(container.read(deliveredQuantitiesProvider)['ORD-4521'], isNull);
    });

    testWidgets('quantity cannot go below zero', (tester) async {
      await pumpArrived(tester);
      final container =
          ProviderScope.containerOf(tester.element(find.text('ORD-4522')));
      for (var i = 0; i < 12; i++) {
        await tester.tap(inCard('ORD-4522', const Key('stepper-minus')));
        await tester.pump();
      }
      expect(container.read(deliveredQuantitiesProvider)['ORD-4522'], 0);
    });

    testWidgets('a stop that has not been marked arrived shows a dash',
        (tester) async {
      await pumpTripRoutes(tester, location: '$stop3/arrived');
      expect(find.text('Arrived at'), findsOneWidget);
      expect(find.text('—'), findsOneWidget);
    });

    testWidgets('the back link returns to My trips', (tester) async {
      await pumpArrived(tester);
      await tester.tap(find.byKey(const Key('back-bar-button')));
      await tester.pumpAndSettle();
      expect(find.text('Trips page'), findsOneWidget);
    });
  });
}
