import 'package:driver_app/features/notifications/data/derived_notifications_repository.dart';
import 'package:driver_app/features/notifications/domain/app_notification.dart';
import 'package:driver_app/features/route_update/data/route_changes_repository.dart';
import 'package:driver_app/features/route_update/domain/route_change.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/shortfall_report.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixed_trips_repository.dart';

class _Changes implements RouteChangesRepository {
  _Changes(this.byTrip);

  final Map<String, RouteChange> byTrip;

  @override
  Future<RouteChange?> get(String tripId) async => byTrip[tripId];

  @override
  Future<RouteChange> acknowledge(String tripId) => throw UnimplementedError();
}

RouteChange change(String tripId, {bool acknowledged = false}) => RouteChange(
  tripId: tripId,
  planVersion: 2,
  updatedAt: DateTime(2026, 10, 4, 8, 0),
  reason: 'Mall closed until 8',
  previous: const [],
  updated: const [],
  impactStopName: 'Mall',
  impactArrivalNow: '08:10 AM',
  impactArrivalWas: '07:50 AM',
  tightWindow: null,
  acknowledged: acknowledged,
);

void main() {
  final now = DateTime(2026, 10, 4, 9, 0);

  Future<List<Trip>> seed() => MockTripsRepository(
    latency: Duration.zero,
    today: now,
    now: () => now,
  ).getTrips();

  test('an unacknowledged route change becomes an error update', () async {
    final trips = await seed();
    final repo = DerivedNotificationsRepository(
      FixedTripsRepository(trips),
      _Changes({trips.first.id: change(trips.first.id)}),
      now: () => now,
    );

    final list = await repo.getNotifications();
    final route = list.singleWhere(
      (n) => n.kind == NotificationKind.stopSequenceChanged,
    );
    expect(route.severity, NotificationSeverity.error);
    expect(route.tripId, trips.first.id);
    expect(route.body, 'Mall closed until 8');
    expect(route.actionLabel, 'Review changes');
  });

  test('an acknowledged route change is not repeated', () async {
    final trips = await seed();
    final repo = DerivedNotificationsRepository(
      FixedTripsRepository(trips),
      _Changes({trips.first.id: change(trips.first.id, acknowledged: true)}),
      now: () => now,
    );

    final list = await repo.getNotifications();
    expect(
      list.where((n) => n.kind == NotificationKind.stopSequenceChanged),
      isEmpty,
    );
  });

  test('loading, ready and assigned trips each say where they stand', () async {
    final base = (await seed()).first;
    final trips = [
      base.copyWith(status: TripStatus.loading),
      Trip(
        id: 'b',
        name: 'Trip B',
        subtitle: 'Fresh',
        departure: now,
        status: TripStatus.ready,
        stops: const [],
      ),
      Trip(
        id: 'c',
        name: 'Trip C',
        subtitle: 'Dry goods',
        departure: now,
        status: TripStatus.assigned,
        stops: const [],
      ),
    ];
    final repo = DerivedNotificationsRepository(
      FixedTripsRepository(trips),
      _Changes({}),
      now: () => now,
    );

    final titles = (await repo.getNotifications()).map((n) => n.title).toList();
    expect(titles, contains('Loading started for ${base.name}'));
    expect(titles, contains('Trip B is loaded and ready'));
    expect(titles, contains('Trip C assigned'));
  });

  test(
    'a loading shortfall is called out and a finished trip is quiet',
    () async {
      final base = (await seed()).first;
      final short = Trip(
        id: 's',
        name: 'Trip S',
        subtitle: 'x',
        departure: now,
        status: TripStatus.ready,
        stops: const [],
        shortfall: const ShortfallReport(
          orderId: 'ORD0000012',
          storeName: 'Fresh',
          shortCases: 2,
          plannedCases: 12,
          dispatcherNote: 'Deliver the rest',
        ),
      );
      final done = base.copyWith(status: TripStatus.completed);
      final repo = DerivedNotificationsRepository(
        FixedTripsRepository([short, done]),
        _Changes({}),
        now: () => now,
      );

      final list = await repo.getNotifications();
      final shortfall = list.singleWhere(
        (n) => n.title == 'Cases short on Trip S',
      );
      expect(shortfall.body, '2 of 12 cases for Fresh were not loaded.');
      expect(list.where((n) => n.tripId == done.id), isEmpty);
    },
  );

  test('newest first', () async {
    final trips = await seed();
    final repo = DerivedNotificationsRepository(
      FixedTripsRepository([trips.first.copyWith(status: TripStatus.ready)]),
      _Changes({trips.first.id: change(trips.first.id)}),
      now: () => now,
    );

    final list = await repo.getNotifications();
    for (var i = 1; i < list.length; i++) {
      expect(list[i - 1].createdAt.isBefore(list[i].createdAt), isFalse);
    }
  });
}
