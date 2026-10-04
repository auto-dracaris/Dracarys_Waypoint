import 'package:driver_app/features/records/data/mock_records_repository.dart';
import 'package:driver_app/features/records/domain/saved_record.dart';
import 'package:driver_app/features/stops/presentation/delivered_quantities.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

const proof3 = '$stop3/proof';
const proof4 = '$stop4/proof';
const issue3 = '$stop3/issue/ORD-4521';

Future<MockTripsRepository> arrivedRepo(WidgetTester tester) async {
  final repo = testTripsRepository();
  await tester.runAsync(() => repo.markArrived('trip-1'));
  return repo;
}

Future<void> sign(WidgetTester tester) async {
  await tester.drag(
      find.byKey(const Key('signature-surface')), const Offset(80, 30));
  await tester.pump();
}

Future<void> fillName(WidgetTester tester, String name) async {
  await tester.enterText(find.byKey(const Key('staff-name')), name);
  await tester.pump();
}

Future<void> tapComplete(WidgetTester tester) async {
  await tester.ensureVisible(find.text('Complete stop'));
  await tester.tap(find.text('Complete stop'));
  await tester.pumpAndSettle();
}

void main() {
  group('Proof of delivery', () {
    testWidgets('shows the summary, timestamps and the sign-off form',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: proof3, trips: repo);

      expect(find.text('STOP 3 OF 4'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('Delivery summary'), findsOneWidget);
      expect(find.text('ORD-4521'), findsOneWidget);
      expect(find.text('12 cases delivered'), findsOneWidget);
      expect(find.text('ORD-4522'), findsOneWidget);
      expect(find.text('8 cases delivered'), findsOneWidget);
      expect(find.text('Total'), findsOneWidget);
      expect(find.text('20 cases total'), findsOneWidget);
      expect(find.text('Arrived'), findsOneWidget);
      expect(find.text('Completing'), findsOneWidget);
      expect(find.text('07:08 AM'), findsNWidgets(2));
      expect(find.text('Received by'), findsOneWidget);
      expect(find.text('Staff member name'), findsOneWidget);
      expect(find.text('Proof of delivery'), findsOneWidget);
      expect(find.text('Signature'), findsOneWidget);
      expect(find.text('Photo'), findsOneWidget);
      expect(find.text('Notes (optional)'), findsOneWidget);
      expect(find.text('Complete stop'), findsOneWidget);
    });

    testWidgets('the summary follows the quantities entered on arrival',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: proof3, trips: repo);
      final container =
          ProviderScope.containerOf(tester.element(find.text('Total')));
      container.read(deliveredQuantitiesProvider.notifier).set('ORD-4522', 5);
      await tester.pump();

      expect(find.text('5 cases delivered'), findsOneWidget);
      expect(find.text('17 cases total'), findsOneWidget);
    });

    testWidgets('completing without a name or proof is blocked with messages',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: proof3, trips: repo);

      await tapComplete(tester);
      expect(find.text("Enter the staff member's name"), findsOneWidget);
      expect(find.text('Capture a signature or photo'), findsOneWidget);

      await fillName(tester, '   '); // whitespace is not a name
      await tapComplete(tester);
      expect(find.text("Enter the staff member's name"), findsOneWidget);

      await fillName(tester, 'Kumara Perera');
      await tapComplete(tester);
      expect(find.text("Enter the staff member's name"), findsNothing);
      expect(find.text('Capture a signature or photo'), findsOneWidget);

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 2); // nothing was completed
    });

    testWidgets('a signature and a name complete the stop and open the next',
        (tester) async {
      final repo = await arrivedRepo(tester);
      final records = MockRecordsRepository(latency: Duration.zero);
      await pumpTripRoutes(tester,
          location: proof3, trips: repo, records: records);

      await fillName(tester, 'Kumara Perera');
      await sign(tester);
      await tapComplete(tester);

      expect(find.text('NEXT STOP · 4 OF 4'), findsOneWidget);
      expect(find.text('Lanka Sathosa — Ragama'), findsOneWidget);

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
      final saved =
          (await tester.runAsync(() => records.list('trip-1')))!;
      expect(saved.map((r) => r.kind), [RecordKind.proof]);
    });

    testWidgets('delivered quantities are recorded and then cleared',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: proof3, trips: repo);
      final container =
          ProviderScope.containerOf(tester.element(find.text('Total')));
      container.read(deliveredQuantitiesProvider.notifier).set('ORD-4522', 6);
      await tester.pump();

      await fillName(tester, 'Kumara');
      await sign(tester);
      await tapComplete(tester);

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.stops[2].orders.map((o) => o.deliveredCases), [12, 6]);
      expect(container.read(deliveredQuantitiesProvider), isEmpty);
    });

    testWidgets('a photo can replace the signature', (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: proof3, trips: repo);

      await fillName(tester, 'Kumara');
      await tester.tap(find.text('Photo'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('signature-surface')), findsNothing);

      // Photo mode with no photo is still blocked.
      await tapComplete(tester);
      expect(find.text('Capture a signature or photo'), findsOneWidget);

      await tester.tap(find.text('Add photo'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('photo-remove')), findsOneWidget);
      await tapComplete(tester);

      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 3);
    });

    testWidgets('completing the last stop finishes the trip and goes home',
        (tester) async {
      final repo = testTripsRepository();
      await tester.runAsync(() async {
        await repo.markArrived('trip-1');
        await repo.completeStop('trip-1', 'trip-1-stop-3');
        await repo.markArrived('trip-1');
      });
      await pumpTripRoutes(tester, location: proof4, trips: repo);
      expect(find.text('STOP 4 OF 4'), findsOneWidget);

      await fillName(tester, 'Nimali');
      await sign(tester);
      await tapComplete(tester);

      expect(find.text('Trips page'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.completed);
    });

    testWidgets('a stop that has not been marked arrived cannot be completed',
        (tester) async {
      final repo = testTripsRepository();
      await pumpTripRoutes(tester, location: proof3, trips: repo);

      await fillName(tester, 'Kumara');
      await sign(tester);
      await tapComplete(tester);

      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('Complete stop'), findsOneWidget); // still here
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.completedStops, 2);
    });
  });

  group('Report an issue', () {
    testWidgets('shows the order context and the quantity breakdown',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: issue3, trips: repo);

      expect(find.text('STOP 3 OF 4'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('Reporting issue for order'), findsOneWidget);
      expect(find.text('ORD-4521'), findsOneWidget);
      expect(find.text('Chilled'), findsOneWidget);
      expect(find.text('Quantity Breakdown'), findsOneWidget);
      expect(find.text('PLANNED'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      expect(find.text('AFFECTED'), findsOneWidget);
      expect(find.text('DELIVERABLE'), findsOneWidget);
      expect(find.text('Issue Details'), findsOneWidget);
      expect(find.text('Issue Type'), findsOneWidget);
      expect(find.text('Damaged goods — chilled'), findsOneWidget);
      expect(find.text('Affected Quantity'), findsOneWidget);
      expect(find.text('Enter number of damaged cases'), findsOneWidget);
      expect(find.text('Short Note'), findsOneWidget);
      expect(find.text('Attach photo evidence (recommended)'), findsOneWidget);
      expect(find.text('Dispatcher review required'), findsOneWidget);
      expect(find.text('Saved on this device; report will send when connected.'),
          findsOneWidget);
      expect(find.text('Save and report issue'), findsOneWidget);
    });

    testWidgets('the affected quantity drives the breakdown and the notice',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: issue3, trips: repo);

      expect(find.text('Deliverable (11 cases) — ready to hand over once approved'),
          findsOneWidget);

      await tester.tap(find.byKey(const Key('stepper-plus')));
      await tester.pump();
      expect(find.text('Deliverable (10 cases) — ready to hand over once approved'),
          findsOneWidget);
      expect(find.text('Affected (2 cases) — held on vehicle pending decision'),
          findsOneWidget);
    });

    testWidgets('the affected quantity stays between 1 and the planned cases',
        (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: issue3, trips: repo);

      // Already at the minimum.
      await tester.tap(find.byKey(const Key('stepper-minus')));
      await tester.pump();
      expect(find.text('Affected (1 case) — held on vehicle pending decision'),
          findsOneWidget);

      for (var i = 0; i < 15; i++) {
        await tester.tap(find.byKey(const Key('stepper-plus')));
        await tester.pump();
      }
      expect(find.text('Affected (12 cases) — held on vehicle pending decision'),
          findsOneWidget);
      expect(find.text('Deliverable (0 cases) — ready to hand over once approved'),
          findsOneWidget);
    });

    testWidgets('the issue type can be changed', (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: issue3, trips: repo);

      await tester.tap(find.byKey(const Key('dropdown-field')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Temperature breach').last);
      await tester.pumpAndSettle();
      expect(find.text('Temperature breach'), findsOneWidget);
      expect(find.text('Damaged goods — chilled'), findsNothing);
    });

    testWidgets('a photo can be attached and removed', (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: issue3, trips: repo);

      expect(find.byKey(const Key('photo-remove')), findsNothing);
      await tester.ensureVisible(find.text('Add photo'));
      await tester.tap(find.text('Add photo'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('photo-remove')), findsOneWidget);
      expect(find.text('Add photo'), findsOneWidget); // room for another

      await tester.tap(find.byKey(const Key('photo-remove')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('photo-remove')), findsNothing);
    });

    testWidgets('saving records the issue and returns to the arrived screen',
        (tester) async {
      final repo = await arrivedRepo(tester);
      final records = MockRecordsRepository(latency: Duration.zero);
      await pumpTripRoutes(tester,
          location: issue3, trips: repo, records: records);

      await tester.ensureVisible(find.text('Save and report issue'));
      await tester.tap(find.text('Save and report issue'));
      await tester.pumpAndSettle();

      expect(find.text('ARRIVED · STOP 3 OF 4'), findsOneWidget);
      final saved = (await tester.runAsync(() => records.list('trip-1')))!;
      expect(saved.map((r) => r.kind), [RecordKind.issue]);
      expect(saved.single.syncState, SyncState.synced);
    });

    testWidgets('an unknown order shows an error view', (tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester,
          location: '$stop3/issue/ORD-0000', trips: repo);
      expect(find.text('Something went wrong'), findsOneWidget);
    });
  });

  group('Arrived wiring', () {
    Future<void> pumpArrived(WidgetTester tester) async {
      final repo = await arrivedRepo(tester);
      await pumpTripRoutes(tester, location: '$stop3/arrived', trips: repo);
    }

    testWidgets('Continue opens proof of delivery', (tester) async {
      await pumpArrived(tester);
      await tester.ensureVisible(find.text('Continue to proof of delivery'));
      await tester.tap(find.text('Continue to proof of delivery'));
      await tester.pumpAndSettle();
      expect(find.text('Delivery summary'), findsOneWidget);
    });

    testWidgets('Report an issue with several orders asks which one',
        (tester) async {
      await pumpArrived(tester);
      await tester.ensureVisible(find.text('Report an issue'));
      await tester.tap(find.text('Report an issue'));
      await tester.pumpAndSettle();

      expect(find.text('Which order has the issue?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('issue-order-ORD-4522')));
      await tester.pumpAndSettle();
      expect(find.text('Reporting issue for order'), findsOneWidget);
      expect(find.text('ORD-4522'), findsOneWidget);
      expect(find.text('Damaged goods — ambient'), findsOneWidget);
    });

    testWidgets('Report an issue with one order goes straight to the form',
        (tester) async {
      final repo = testTripsRepository();
      await tester.runAsync(() async {
        await repo.markArrived('trip-1');
        await repo.completeStop('trip-1', 'trip-1-stop-3');
        await repo.markArrived('trip-1');
      });
      await pumpTripRoutes(tester, location: '$stop4/arrived', trips: repo);

      await tester.ensureVisible(find.text('Report an issue'));
      await tester.tap(find.text('Report an issue'));
      await tester.pumpAndSettle();
      expect(find.text('Reporting issue for order'), findsOneWidget);
      expect(find.text('ORD-4530'), findsOneWidget);
    });
  });
}
