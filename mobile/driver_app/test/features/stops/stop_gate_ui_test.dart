import 'package:driver_app/features/route_update/data/mock_route_changes_repository.dart';
import 'package:driver_app/features/stops/presentation/delivered_quantities.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/test_app.dart';

void main() {
  offlineTests();
  holdTests();
  testWidgets('a loading trip offers no directions or arrival on a stop', (
    tester,
  ) async {
    await pumpTripRoutes(
      tester,
      location: stop3,
      trips: testTripsRepository(onTheRoad: false),
    );

    expect(find.byKey(const Key('stop-gate-notice')), findsOneWidget);
    expect(find.text('Still being loaded'), findsOneWidget);
    expect(find.text('Get Directions'), findsNothing);
    expect(find.text('Mark arrived'), findsNothing);
  });

  testWidgets('deep links to directions or arrival are blocked while loading', (
    tester,
  ) async {
    for (final path in ['$stop3/navigate', '$stop3/arrived']) {
      await pumpTripRoutes(
        tester,
        location: path,
        trips: testTripsRepository(onTheRoad: false),
      );
      expect(find.text('Still being loaded'), findsOneWidget, reason: path);
      expect(find.text('Back to trip'), findsOneWidget, reason: path);
    }
  });

  testWidgets('a trip on the road still offers the active stop actions', (
    tester,
  ) async {
    await pumpTripRoutes(tester, location: stop3);
    expect(find.text('Get Directions'), findsOneWidget);
    expect(find.text('Mark arrived'), findsOneWidget);
  });
}

void offlineTests() {
  testWidgets('the saved trip of a loading trip says why no stop is open', (
    tester,
  ) async {
    await pumpTripRoutes(
      tester,
      location: offline1,
      trips: testTripsRepository(onTheRoad: false),
    );
    expect(find.byKey(const Key('offline-trip-waiting')), findsOneWidget);
    expect(find.text('Still being loaded'), findsOneWidget);
    expect(find.textContaining('continue recording arrivals'), findsNothing);

    await tester.tap(find.text('View saved trip'));
    await tester.pumpAndSettle();
    // Goes to the overview, not to a stop it cannot work on.
    expect(find.text('UNLOADING SEQUENCE (4 STOPS)'), findsOneWidget);
  });
}

void holdTests() {
  testWidgets('an unreviewed route update holds the stop', (tester) async {
    await pumpTripRoutes(
      tester,
      location: stop3,
      routeChanges: MockRouteChangesRepository(
        latency: Duration.zero,
        now: () => testNow,
      ),
    );
    expect(find.byKey(const Key('route-update-hold')), findsOneWidget);
    expect(find.text('Mark arrived'), findsNothing);
    expect(find.text('Get Directions'), findsNothing);
  });

  testWidgets('a short delivery holds Continue until it is reported', (
    tester,
  ) async {
    final repo = testTripsRepository();
    await tester.runAsync(() => repo.markArrived('trip-1'));
    await pumpTripRoutes(tester, location: '$stop3/arrived', trips: repo);
    expect(find.text('Continue to proof of delivery'), findsOneWidget);

    final container = ProviderScope.containerOf(
      tester.element(find.text('Report an issue')),
    );
    container.read(deliveredQuantitiesProvider.notifier).set('ORD-4522', 6);
    await tester.pump();
    expect(find.byKey(const Key('short-delivery-hold')), findsOneWidget);
    expect(find.text('Continue to proof of delivery'), findsNothing);

    container.read(reportedOrdersProvider.notifier).add('ORD-4522');
    await tester.pump();
    expect(find.text('Continue to proof of delivery'), findsOneWidget);
  });
}
