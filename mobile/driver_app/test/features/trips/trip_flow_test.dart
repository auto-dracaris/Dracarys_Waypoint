import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/data/notifications_providers.dart';
import 'package:driver_app/features/notifications/presentation/updates_screen.dart';
import 'package:driver_app/features/records/data/mock_records_repository.dart';
import 'package:driver_app/features/records/domain/saved_record.dart';
import 'package:driver_app/features/route_update/data/mock_route_changes_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:driver_app/features/trips/presentation/my_trips_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  group('Trip overview', () {
    testWidgets(
      'a loading trip shows the summary, sequence and a locked button',
      (tester) async {
        await pumpTripRoutes(tester, location: overview1);

        expect(find.text('My trips'), findsOneWidget);
        expect(find.text('VEH021'), findsOneWidget);
        expect(find.text('Online'), findsOneWidget);

        expect(find.text('Trip 1'), findsOneWidget);
        expect(find.text('Refrigerated van'), findsOneWidget);
        expect(find.text('Fresh deliveries · Gampaha'), findsOneWidget);
        expect(find.text('DEPARTURE'), findsOneWidget);
        expect(find.text('05:30 AM'), findsOneWidget);
        expect(find.text('STOPS'), findsOneWidget);
        expect(find.text('4 Stops'), findsOneWidget);
        expect(find.text('PLAN VERSION'), findsOneWidget);
        expect(find.text('Plan v3'), findsOneWidget);
        expect(find.text('Plan v3 · Updated 2 min ago'), findsOneWidget);

        expect(find.text('Loading in progress'), findsOneWidget);
        expect(find.text('Loading complete'), findsNothing);
        expect(find.text('SHORTFALL REPORTED'), findsNothing);

        expect(find.text('UNLOADING SEQUENCE (4 STOPS)'), findsOneWidget);
        for (final name in [
          'Cargills Food City — Kadawatha',
          'Keells Super — Kiribathgoda',
          'Waypoint Fresh — Ja-Ela',
          'Lanka Sathosa — Ragama',
        ]) {
          expect(find.text(name), findsOneWidget);
        }
        expect(find.text('Window: 05:45–07:00'), findsOneWidget);
        expect(find.text('Arrival: 05:50 AM'), findsOneWidget);
        expect(find.text('3 orders'), findsOneWidget);
        expect(find.text('2 orders'), findsNWidgets(2));
        expect(find.text('1 order'), findsOneWidget);
        expect(find.text('Ambient'), findsNWidgets(4));
        expect(find.text('Chilled'), findsNWidgets(2));

        expect(find.text('Ready to depart'), findsOneWidget);
        expect(
          find.text('Waiting for the loading team to finish'),
          findsOneWidget,
        );
      },
    );

    testWidgets('Ready to depart is inert until loading is complete', (
      tester,
    ) async {
      final repo = testTripsRepository(onTheRoad: false);
      await pumpTripRoutes(tester, location: overview1, trips: repo);

      await tapVisible(tester, find.text('Ready to depart'));
      expect(find.text('NEXT STOP · 3 OF 4'), findsNothing);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.loading);
    });

    testWidgets('long-pressing the loading banner finishes loading', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: overview1);

      await tester.longPress(find.byKey(const Key('loading-banner')));
      await tester.pumpAndSettle();

      expect(find.text('Loading in progress'), findsNothing);
      expect(find.text('Loading complete'), findsOneWidget);
      expect(find.text('All cargo palletized and loaded'), findsOneWidget);
      expect(find.text('SHORTFALL REPORTED'), findsOneWidget);
      expect(
        find.textContaining('2 of 12 cases short', findRichText: true),
        findsOneWidget,
      );
      expect(
        find.textContaining(
          'ORD-4521 (Waypoint Fresh — Ja-Ela)',
          findRichText: true,
        ),
        findsOneWidget,
      );
      expect(
        find.text('Dispatcher: Proceed with partial load.'),
        findsOneWidget,
      );
      expect(
        find.text('Load confirmed · Plan v3 acknowledged'),
        findsOneWidget,
      );
    });

    testWidgets('a trip with no shortfall shows only the loading result', (
      tester,
    ) async {
      final repo = testTripsRepository(onTheRoad: false);
      await tester.runAsync(() => repo.simulateLoadingComplete('trip-2'));
      await pumpTripRoutes(tester, location: '/trips/trip/trip-2', trips: repo);
      expect(find.text('Loading complete'), findsOneWidget);
      expect(find.text('SHORTFALL REPORTED'), findsNothing);
    });

    testWidgets('Ready to depart starts the trip and opens the active stop', (
      tester,
    ) async {
      final repo = testTripsRepository(onTheRoad: false);
      await tester.runAsync(() => repo.simulateLoadingComplete('trip-1'));
      await pumpTripRoutes(tester, location: overview1, trips: repo);

      await tapVisible(tester, find.text('Ready to depart'));

      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
      final trip = (await tester.runAsync(() => repo.getTrip('trip-1')))!;
      expect(trip.status, TripStatus.inProgress);
    });

    testWidgets('a trip under way offers Continue trip', (tester) async {
      final repo = testTripsRepository();
      await tester.runAsync(() => repo.startTrip('trip-1'));
      await pumpTripRoutes(tester, location: overview1, trips: repo);

      expect(find.text('Ready to depart'), findsNothing);
      await tapVisible(tester, find.text('Continue trip'));
      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
    });

    testWidgets('completed stops are ticked and stops open on tap', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: overview1);

      expect(find.byKey(const Key('stop-done-1')), findsOneWidget);
      expect(find.byKey(const Key('stop-done-2')), findsOneWidget);
      expect(find.byKey(const Key('stop-done-3')), findsNothing);

      await tapVisible(tester, find.text('Lanka Sathosa — Ragama'));
      expect(find.text('NEXT STOP · 4 OF 4'), findsOneWidget);
    });

    testWidgets('the back link returns to My trips', (tester) async {
      await pumpTripRoutes(tester, location: overview1);
      await tester.tap(find.byKey(const Key('back-link')));
      await tester.pumpAndSettle();
      expect(find.text('Trips page'), findsOneWidget);
    });

    testWidgets('an unknown trip shows an error view', (tester) async {
      await pumpTripRoutes(tester, location: '/trips/trip/nope');
      expect(find.text('Something went wrong'), findsOneWidget);
    });
  });

  group('Route update', () {
    testWidgets('shows the dispatcher change, comparison and impact', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: routeUpdate1);

      expect(find.text('My trips'), findsOneWidget);
      expect(find.text('VEH021'), findsOneWidget);
      expect(find.text('Route updated by dispatcher'), findsOneWidget);
      expect(find.text('Updated 2 min ago · Plan v3'), findsOneWidget);
      expect(
        find.textContaining(
          'Gampaha Mall access restricted until 08:00',
          findRichText: true,
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          'Updated route not yet downloaded. Saved route still available offline.',
        ),
        findsOneWidget,
      );

      expect(find.text('STOP SEQUENCE CHANGES — TRIP 1'), findsOneWidget);
      expect(find.text('PREVIOUS ORDER'), findsOneWidget);
      expect(find.text('NEW SEQUENCE'), findsOneWidget);
      expect(find.text('Completed'), findsNWidgets(4));
      expect(find.text('1. Keells Wattala'), findsNWidgets(2));
      expect(find.text('3. Waypoint Fresh'), findsOneWidget); // previous
      expect(find.text('4. Waypoint Fresh'), findsOneWidget); // new
      expect(find.text('3. Gampaha Mall'), findsOneWidget); // new
      expect(find.text('4. Gampaha Mall'), findsOneWidget); // previous
      expect(find.text('UP ↑'), findsOneWidget);
      expect(find.text('DOWN'), findsOneWidget);

      expect(find.text('Estimated Impact'), findsOneWidget);
      expect(
        find.textContaining('07:25 AM', findRichText: true),
        findsOneWidget,
      );
      expect(
        find.textContaining('was 07:10 AM', findRichText: true),
        findsOneWidget,
      );
      expect(
        find.text('Tight Window — Ja-Ela delivery closes 08:00'),
        findsOneWidget,
      );
      expect(find.text('Acknowledge updated route'), findsOneWidget);
      expect(
        find.textContaining('View full trip', findRichText: true),
        findsOneWidget,
      );
    });

    testWidgets('Acknowledge records it and returns to Updates', (
      tester,
    ) async {
      final changes = MockRouteChangesRepository(
        latency: Duration.zero,
        now: () => testNow,
      );
      await pumpTripRoutes(
        tester,
        location: routeUpdate1,
        routeChanges: changes,
      );

      await tapVisible(tester, find.text('Acknowledge updated route'));

      expect(find.text('Updates page'), findsOneWidget);
      final change = (await tester.runAsync(() => changes.get('trip-1')))!;
      expect(change.acknowledged, isTrue);
    });

    testWidgets('an acknowledged change cannot be acknowledged again', (
      tester,
    ) async {
      final changes = MockRouteChangesRepository(
        latency: Duration.zero,
        now: () => testNow,
      );
      await tester.runAsync(() => changes.acknowledge('trip-1'));
      await pumpTripRoutes(
        tester,
        location: routeUpdate1,
        routeChanges: changes,
      );

      expect(find.text('Acknowledge updated route'), findsNothing);
      expect(find.text('Route acknowledged'), findsOneWidget);
      await tester.tap(find.text('Route acknowledged'), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(find.text('Updates page'), findsNothing);
    });

    testWidgets('View full trip opens the trip overview', (tester) async {
      await pumpTripRoutes(tester, location: routeUpdate1);
      await tapVisible(
        tester,
        find.textContaining('View full trip', findRichText: true),
      );
      expect(find.text('DEPARTURE'), findsOneWidget);
    });

    testWidgets('the back link returns to Updates', (tester) async {
      await pumpTripRoutes(tester, location: routeUpdate1);
      await tester.tap(find.byKey(const Key('back-link')));
      await tester.pumpAndSettle();
      expect(find.text('Updates page'), findsOneWidget);
    });

    testWidgets('a trip without a route change shows an error view', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: '/updates/route-update/trip-2');
      expect(find.text('Something went wrong'), findsOneWidget);
    });
  });

  group('Offline trip', () {
    Future<ProviderContainer> pumpOffline(
      WidgetTester tester, {
      MockRecordsRepository? records,
      bool goOffline = true,
    }) async {
      await pumpTripRoutes(tester, location: offline1, records: records);
      final container = ProviderScope.containerOf(
        tester.element(find.text('VEH021')),
      );
      if (goOffline) {
        container.read(onlineProvider.notifier).toggle();
        await tester.pumpAndSettle();
      }
      return container;
    }

    testWidgets('explains the situation and shows the next stop', (
      tester,
    ) async {
      await pumpOffline(tester);

      expect(find.text('My trips'), findsOneWidget);
      expect(find.text('VEH021'), findsOneWidget);
      expect(find.text('Offline'), findsOneWidget);
      expect(find.text('No connection'), findsOneWidget);
      expect(
        find.text(
          'Trip 1 route and stop details were downloaded and are available on this device.',
        ),
        findsOneWidget,
      );
      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
      expect(find.text('Waypoint Fresh — Ja-Ela'), findsOneWidget);
      expect(find.text('Delivery window'), findsOneWidget);
      expect(find.text('06:00-08:00'), findsOneWidget);
      expect(find.text('Planned arrival'), findsOneWidget);
      expect(find.text('07:10 AM'), findsOneWidget);
      expect(
        find.text(
          'You can continue recording arrivals, issues, and proof of delivery while offline.',
        ),
        findsOneWidget,
      );
      expect(find.text('View saved trip'), findsOneWidget);
    });

    testWidgets('lists the records saved on the device with their sync state', (
      tester,
    ) async {
      final records = MockRecordsRepository(latency: Duration.zero);
      await tester.runAsync(() async {
        await records.add(
          SavedRecord(
            id: 'a',
            tripId: 'trip-1',
            kind: RecordKind.arrival,
            title: 'Arrival at Waypoint Fresh',
            savedAt: DateTime(2026, 9, 29, 7, 12),
            syncState: SyncState.synced,
          ),
        );
        await records.add(
          SavedRecord(
            id: 'b',
            tripId: 'trip-1',
            kind: RecordKind.issue,
            title: 'Delivery issue report',
            savedAt: DateTime(2026, 9, 29, 7, 18),
            syncState: SyncState.waitingToSync,
          ),
        );
        await records.add(
          SavedRecord(
            id: 'c',
            tripId: 'trip-1',
            kind: RecordKind.proof,
            title: 'Proof of delivery',
            savedAt: DateTime(2026, 9, 29, 7, 25),
            syncState: SyncState.waitingToSync,
          ),
        );
      });
      await pumpOffline(tester, records: records);

      expect(find.text('Records saved on this device'), findsOneWidget);
      expect(find.text('Arrival at Waypoint Fresh'), findsOneWidget);
      expect(find.text('Saved 07:12 AM'), findsOneWidget);
      expect(find.text('Delivery issue report'), findsOneWidget);
      expect(find.text('Saved 07:18 AM'), findsOneWidget);
      expect(find.text('Proof of delivery'), findsOneWidget);
      expect(find.text('Saved 07:25 AM'), findsOneWidget);
      expect(find.text('Waiting to sync'), findsNWidgets(2));
      expect(find.text('Synced'), findsOneWidget);
    });

    testWidgets('says so when nothing has been saved yet', (tester) async {
      await pumpOffline(tester);
      expect(find.text('Nothing saved yet'), findsOneWidget);
    });

    testWidgets('offers the pending route update and opens it', (tester) async {
      await pumpOffline(tester);
      expect(find.text('Route update available'), findsOneWidget);

      await tapVisible(tester, find.text('Review changes'));
      expect(find.text('Route updated by dispatcher'), findsOneWidget);
    });

    testWidgets('hides the route update notice once acknowledged', (
      tester,
    ) async {
      final changes = MockRouteChangesRepository(
        latency: Duration.zero,
        now: () => testNow,
      );
      await tester.runAsync(() => changes.acknowledge('trip-1'));
      await pumpTripRoutes(tester, location: offline1, routeChanges: changes);
      expect(find.text('Route update available'), findsNothing);
    });

    testWidgets('View saved trip opens the active stop', (tester) async {
      await pumpOffline(tester);
      await tapVisible(tester, find.text('View saved trip'));
      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
    });

    testWidgets('when the connection returns the offline banner goes away', (
      tester,
    ) async {
      final container = await pumpOffline(tester);
      expect(find.text('No connection'), findsOneWidget);

      container.read(onlineProvider.notifier).toggle();
      await tester.pumpAndSettle();
      expect(find.text('No connection'), findsNothing);
      expect(find.text('Online'), findsOneWidget);
    });

    testWidgets('the back link returns to My trips', (tester) async {
      await pumpOffline(tester);
      await tester.tap(find.byKey(const Key('back-link')));
      await tester.pumpAndSettle();
      expect(find.text('Trips page'), findsOneWidget);
    });
  });

  group('Wiring', () {
    testWidgets('My trips: View trip opens the overview while online', (
      tester,
    ) async {
      await pumpTripRoutes(
        tester,
        location: '/trips',
        home: const MyTripsScreen(),
      );
      await tapVisible(tester, find.text('View trip'));
      expect(find.text('DEPARTURE'), findsOneWidget);
    });

    testWidgets('My trips: View trip opens the saved trip while offline', (
      tester,
    ) async {
      await pumpTripRoutes(
        tester,
        location: '/trips',
        home: const MyTripsScreen(),
      );
      final container = ProviderScope.containerOf(
        tester.element(find.text('My trips')),
      );
      container.read(onlineProvider.notifier).toggle();
      await tester.pumpAndSettle();

      await tapVisible(tester, find.text('View trip'));
      expect(find.text('Records saved on this device'), findsOneWidget);
    });

    testWidgets('My trips: a trip under way opens its active stop', (
      tester,
    ) async {
      final repo = testTripsRepository();
      await tester.runAsync(() => repo.startTrip('trip-1'));
      await pumpTripRoutes(
        tester,
        location: '/trips',
        home: const MyTripsScreen(),
        trips: repo,
      );
      await tapVisible(tester, find.text('View trip'));
      expect(find.text('NEXT STOP · 3 OF 4'), findsOneWidget);
    });

    Override notifications() =>
        notificationsRepositoryProvider.overrideWithValue(
          MockNotificationsRepository(
            latency: Duration.zero,
            now: () => testNow,
          ),
        );

    testWidgets('Updates: Review changes opens the route update', (
      tester,
    ) async {
      await pumpTripRoutes(
        tester,
        location: '/updates',
        updatesHome: const UpdatesScreen(),
        overrides: [notifications()],
      );
      await tapVisible(tester, find.text('Review changes'));
      expect(find.text('Route updated by dispatcher'), findsOneWidget);
    });

    testWidgets('Updates: View trip opens the trip overview', (tester) async {
      await pumpTripRoutes(
        tester,
        location: '/updates',
        updatesHome: const UpdatesScreen(),
        overrides: [notifications()],
      );
      await tapVisible(tester, find.text('View trip').first);
      expect(find.text('DEPARTURE'), findsOneWidget);
    });

    testWidgets('All stops opens the overview from the stop screens', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: stop3);
      await tapVisible(tester, find.text('All stops'));
      expect(find.text('DEPARTURE'), findsOneWidget);

      final repo = testTripsRepository();
      await tester.runAsync(() => repo.markArrived('trip-1'));
      await pumpTripRoutes(tester, location: '$stop3/arrived', trips: repo);
      await tapVisible(tester, find.text('All stops'));
      expect(find.text('DEPARTURE'), findsOneWidget);
    });

    testWidgets('Route details opens the overview from the route preview', (
      tester,
    ) async {
      await pumpTripRoutes(tester, location: '$stop3/navigate');
      await tapVisible(tester, find.text('Route details'));
      expect(find.text('DEPARTURE'), findsOneWidget);
    });
  });
}
