import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:driver_app/features/trips/presentation/my_trips_screen.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/fixed_trips_repository.dart';

Future<void> pumpScreen(WidgetTester tester, TripsRepository repo) async {
  tester.view.physicalSize = const Size(402 * 3, 1000 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => const MyTripsScreen()),
      GoRoute(
        path: '/updates',
        builder: (_, _) => const Scaffold(body: Text('Updates page')),
      ),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tripsRepositoryProvider.overrideWithValue(repo),
        // Trips data depends on the signed-in driver, so auth must be instant.
        authRepositoryProvider.overrideWithValue(
          MockAuthRepository(latency: Duration.zero),
        ),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders the header, vehicle banner and both trip cards', (
    tester,
  ) async {
    await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

    expect(find.text('My trips'), findsOneWidget);
    expect(find.text('Online'), findsOneWidget);
    expect(find.text('Synced just now'), findsOneWidget);
    expect(find.text('VEH021'), findsOneWidget);
    expect(find.text('Refrigerated van'), findsOneWidget);

    expect(find.text('Trip 1'), findsOneWidget);
    expect(find.text('Trip 2'), findsOneWidget);
    expect(find.text('Fresh deliveries · Gampaha'), findsNWidgets(2));
    expect(find.text('05:30 AM'), findsOneWidget);
    expect(find.text('07:00 AM'), findsOneWidget);
    expect(find.text('Departure'), findsNWidgets(2));
    expect(find.text('Stops'), findsNWidgets(2));
    expect(find.text('Loading in progress'), findsNWidgets(2));
    expect(
      find.text('Waiting for the loading team to finish.'),
      findsNWidgets(2),
    );
  });

  testWidgets(
    'every trip shows an illustration; first is highlighted with the filled button',
    (tester) async {
      await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

      expect(find.byKey(const Key('trip-illustration')), findsNWidgets(2));
      expect(find.text('View trip'), findsOneWidget);
      expect(find.text('View Trip'), findsOneWidget);
    },
  );

  testWidgets('no loading banner for a trip that is not loading', (
    tester,
  ) async {
    // Real timers don't fire inside testWidgets' fake-async zone.
    final trips = (await tester.runAsync(
      () => MockTripsRepository(latency: Duration.zero).getTrips(),
    ))!;
    await pumpScreen(
      tester,
      FixedTripsRepository([trips.first.copyWith(status: TripStatus.ready)]),
    );

    expect(find.text('Trip 1'), findsOneWidget);
    expect(find.text('Loading in progress'), findsNothing);
  });

  testWidgets('shows an empty state when there are no trips', (tester) async {
    await pumpScreen(tester, FixedTripsRepository(const []));
    expect(find.text('No trips assigned'), findsOneWidget);
  });

  testWidgets('long-pressing the status pill toggles offline for demos', (
    tester,
  ) async {
    await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

    await tester.longPress(find.text('Online'));
    await tester.pumpAndSettle();
    expect(find.text('Offline'), findsOneWidget);
    expect(find.text('Synced just now'), findsNothing);

    await tester.longPress(find.text('Offline'));
    await tester.pumpAndSettle();
    expect(find.text('Online'), findsOneWidget);
  });

  testWidgets('the bell opens the updates tab', (tester) async {
    await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

    await tester.tap(find.byKey(const Key('bell-button')));
    await tester.pumpAndSettle();
    expect(find.text('Updates page'), findsOneWidget);
  });

  group('day selector', () {
    testWidgets('starts on today and steps to other days', (tester) async {
      await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));
      expect(find.textContaining('Today · '), findsOneWidget);
      expect(find.text('Trip 1'), findsOneWidget);

      await tester.tap(find.byKey(const Key('day-next')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Tomorrow · '), findsOneWidget);
      expect(find.text('Trip 1'), findsNothing);
      expect(find.text('No trips assigned'), findsOneWidget);

      // The selector stays usable on an empty day.
      await tester.tap(find.byKey(const Key('day-prev')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Today · '), findsOneWidget);
      expect(find.text('Trip 1'), findsOneWidget);

      await tester.tap(find.byKey(const Key('day-prev')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Yesterday · '), findsOneWidget);
    });

    testWidgets('the calendar jumps to a chosen day', (tester) async {
      await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

      await tester.tap(find.byKey(const Key('day-pick')));
      await tester.pumpAndSettle();
      expect(find.byType(DatePickerDialog), findsOneWidget);

      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Today · '), findsOneWidget);
    });
  });
}
