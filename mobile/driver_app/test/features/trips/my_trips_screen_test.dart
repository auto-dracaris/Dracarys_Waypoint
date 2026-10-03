import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:driver_app/features/trips/domain/vehicle.dart';
import 'package:driver_app/features/trips/presentation/my_trips_screen.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

class _FixedTripsRepository implements TripsRepository {
  _FixedTripsRepository(this.trips);

  final List<Trip> trips;

  @override
  Future<Vehicle> getVehicle() async =>
      const Vehicle(plate: 'VEH021', type: 'Refrigerated van');

  @override
  Future<List<Trip>> getTrips() async => trips;

  @override
  Future<Trip> getTrip(String id) async => trips.firstWhere((t) => t.id == id);

  @override
  Future<Trip> simulateLoadingComplete(String tripId) async => getTrip(tripId);

  @override
  Future<Trip> startTrip(String tripId) async => getTrip(tripId);

  @override
  Future<Trip> markArrived(String tripId) async => getTrip(tripId);

  @override
  Future<Trip> completeStop(String tripId, String stopId,
          {Map<String, int> deliveredCases = const {}}) async =>
      getTrip(tripId);
}

Future<void> pumpScreen(WidgetTester tester, TripsRepository repo) async {
  tester.view.physicalSize = const Size(402 * 3, 1000 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(routes: [
    GoRoute(path: '/', builder: (_, _) => const MyTripsScreen()),
    GoRoute(
        path: '/updates',
        builder: (_, _) => const Scaffold(body: Text('Updates page'))),
  ]);
  await tester.pumpWidget(ProviderScope(
    overrides: [
      tripsRepositoryProvider.overrideWithValue(repo),
      // Trips data depends on the signed-in driver, so auth must be instant.
      authRepositoryProvider
          .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  ));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders the header, vehicle banner and both trip cards',
      (tester) async {
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
    expect(find.text('Waiting for the loading team to finish.'),
        findsNWidgets(2));
  });

  testWidgets('first trip is highlighted with the illustration and filled button',
      (tester) async {
    await pumpScreen(tester, MockTripsRepository(latency: Duration.zero));

    expect(find.byKey(const Key('trip-illustration')), findsOneWidget);
    expect(find.text('View trip'), findsOneWidget);
    expect(find.text('View Trip'), findsOneWidget);
  });

  testWidgets('no loading banner for a trip that is not loading',
      (tester) async {
    // Real timers don't fire inside testWidgets' fake-async zone.
    final trips = (await tester.runAsync(
        () => MockTripsRepository(latency: Duration.zero).getTrips()))!;
    await pumpScreen(tester,
        _FixedTripsRepository([trips.first.copyWith(status: TripStatus.ready)]));

    expect(find.text('Trip 1'), findsOneWidget);
    expect(find.text('Loading in progress'), findsNothing);
  });

  testWidgets('shows an empty state when there are no trips', (tester) async {
    await pumpScreen(tester, _FixedTripsRepository(const []));
    expect(find.text('No trips assigned'), findsOneWidget);
  });

  testWidgets('long-pressing the status pill toggles offline for demos',
      (tester) async {
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
}
