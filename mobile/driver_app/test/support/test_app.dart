import 'package:driver_app/core/clock.dart';
import 'package:driver_app/core/router/trip_routes.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/map_view.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// "Now" for every trip-flow test: 07:08 on 29 Sep 2026.
final testNow = DateTime(2026, 9, 29, 7, 8);

const stop3 = '/trips/trip/trip-1/stop/trip-1-stop-3';
const stop4 = '/trips/trip/trip-1/stop/trip-1-stop-4';

MockTripsRepository testTripsRepository() => MockTripsRepository(
      latency: Duration.zero,
      today: DateTime(2026, 9, 29),
      now: () => testNow,
    );

/// Pumps the trip-flow routes (the same table the app uses) at [location],
/// with instant mock repositories and map tiles switched off.
Future<void> pumpTripRoutes(
  WidgetTester tester, {
  required String location,
  MockTripsRepository? trips,
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = const Size(402 * 3, 1700 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(initialLocation: location, routes: [
    GoRoute(
      path: '/trips',
      builder: (_, _) => const Scaffold(body: Text('Trips page')),
      routes: tripRoutes,
    ),
  ]);
  await tester.pumpWidget(ProviderScope(
    overrides: [
      authRepositoryProvider
          .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
      tripsRepositoryProvider
          .overrideWithValue(trips ?? testTripsRepository()),
      mapTilesEnabledProvider.overrideWithValue(false),
      clockProvider.overrideWithValue(() => testNow),
      ...overrides,
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  ));
  await tester.pumpAndSettle();
}
