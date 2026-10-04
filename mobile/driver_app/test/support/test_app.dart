import 'package:driver_app/core/clock.dart';
import 'package:driver_app/core/router/trip_routes.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/photos/photo_picker.dart';
import 'package:driver_app/core/photos/signature_png.dart';
import 'package:driver_app/core/widgets/map_view.dart';
import 'package:driver_app/features/stops/data/mock_stop_reports_repository.dart';
import 'package:driver_app/features/stops/data/stop_reports_providers.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/records/data/mock_records_repository.dart';
import 'package:driver_app/features/route_update/data/mock_route_changes_repository.dart';
import 'package:driver_app/features/route_update/data/route_changes_providers.dart';
import 'package:driver_app/features/records/data/records_providers.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'fake_photo_picker.dart';

/// "Now" for every trip-flow test: 07:08 on 29 Sep 2026.
final testNow = DateTime(2026, 9, 29, 7, 8);

const stop3 = '/trips/trip/trip-1/stop/trip-1-stop-3';
const stop4 = '/trips/trip/trip-1/stop/trip-1-stop-4';
const overview1 = '/trips/trip/trip-1';
const offline1 = '/trips/trip/trip-1/offline';
const routeUpdate1 = '/updates/route-update/trip-1';

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
  MockRecordsRepository? records,
  MockRouteChangesRepository? routeChanges,
  Widget? home,
  Widget? updatesHome,
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = const Size(402 * 3, 1700 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(
        path: '/trips',
        builder: (_, _) => home ?? const Scaffold(body: Text('Trips page')),
        routes: tripRoutes,
      ),
      GoRoute(
        path: '/updates',
        builder: (_, _) =>
            updatesHome ?? const Scaffold(body: Text('Updates page')),
        routes: updateRoutes,
      ),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          MockAuthRepository(latency: Duration.zero),
        ),
        tripsRepositoryProvider.overrideWithValue(
          trips ?? testTripsRepository(),
        ),
        recordsRepositoryProvider.overrideWithValue(
          records ?? MockRecordsRepository(latency: Duration.zero),
        ),
        routeChangesRepositoryProvider.overrideWithValue(
          routeChanges ??
              MockRouteChangesRepository(
                latency: Duration.zero,
                now: () => testNow,
              ),
        ),
        stopReportsRepositoryProvider.overrideWithValue(
          MockStopReportsRepository(latency: Duration.zero),
        ),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
        signatureEncoderProvider.overrideWithValue((_) async => tinyPng),
        mapTilesEnabledProvider.overrideWithValue(false),
        clockProvider.overrideWithValue(() => testNow),
        ...overrides,
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}
