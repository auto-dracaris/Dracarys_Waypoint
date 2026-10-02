import 'package:driver_app/core/clock.dart';
import 'package:driver_app/core/connectivity/online_provider.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/records/data/mock_records_repository.dart';
import 'package:driver_app/features/records/data/records_providers.dart';
import 'package:driver_app/features/records/domain/saved_record.dart';
import 'package:driver_app/features/trips/application/trip_actions.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final _now = DateTime(2026, 9, 29, 7, 12);

SavedRecord record(String id, String tripId, DateTime at,
        {RecordKind kind = RecordKind.arrival,
        SyncState sync = SyncState.synced}) =>
    SavedRecord(
        id: id,
        tripId: tripId,
        kind: kind,
        title: 'Title $id',
        savedAt: at,
        syncState: sync);

ProviderContainer container() {
  final c = ProviderContainer(overrides: [
    authRepositoryProvider
        .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
    tripsRepositoryProvider.overrideWithValue(MockTripsRepository(
        latency: Duration.zero, today: DateTime(2026, 9, 29), now: () => _now)),
    clockProvider.overrideWithValue(() => _now),
  ]);
  addTearDown(c.dispose);
  return c;
}

void main() {
  group('MockRecordsRepository', () {
    test('lists a trip\'s records newest first', () async {
      final r = MockRecordsRepository(latency: Duration.zero);
      await r.add(record('a', 'trip-1', DateTime(2026, 9, 29, 7, 12)));
      await r.add(record('b', 'trip-1', DateTime(2026, 9, 29, 7, 25)));
      await r.add(record('c', 'trip-2', DateTime(2026, 9, 29, 8, 0)));

      final list = await r.list('trip-1');
      expect(list.map((x) => x.id), ['b', 'a']);
      expect(await r.list('trip-2'), hasLength(1));
      expect(await r.list('nope'), isEmpty);
    });
  });

  group('TripActions records', () {
    test('markArrived saves an arrival record that is synced while online',
        () async {
      final c = container();
      await c.read(tripActionsProvider).markArrived('trip-1');

      final list = await c.read(recordsRepositoryProvider).list('trip-1');
      expect(list, hasLength(1));
      expect(list.single.kind, RecordKind.arrival);
      expect(list.single.title, 'Arrival at Waypoint Fresh — Ja-Ela');
      expect(list.single.savedAt, _now);
      expect(list.single.syncState, SyncState.synced);
    });

    test('while offline records wait to sync', () async {
      final c = container();
      c.read(onlineProvider.notifier).toggle();
      await c.read(tripActionsProvider).markArrived('trip-1');

      final list = await c.read(recordsRepositoryProvider).list('trip-1');
      expect(list.single.syncState, SyncState.waitingToSync);
    });

    test('completeStop saves a proof record and finishes the stop', () async {
      final c = container();
      final actions = c.read(tripActionsProvider);
      await actions.markArrived('trip-1');
      await actions.completeStop('trip-1', 'trip-1-stop-3',
          deliveredCases: {'ORD-4521': 12});

      final list = await c.read(recordsRepositoryProvider).list('trip-1');
      expect(list.map((r) => r.kind),
          containsAll([RecordKind.arrival, RecordKind.proof]));
      await c.read(authControllerProvider.future); // settle auth first
      final trip = await c.read(tripProvider('trip-1').future);
      expect(trip.completedStops, 3);
    });

    test('completeStop on an unknown stop saves nothing', () async {
      final c = container();
      await c.read(tripActionsProvider).completeStop('trip-1', 'nope');
      expect(await c.read(recordsRepositoryProvider).list('trip-1'), isEmpty);
    });

    test('reportIssue saves an issue record', () async {
      final c = container();
      await c.read(tripActionsProvider).reportIssue('trip-1');
      final list = await c.read(recordsRepositoryProvider).list('trip-1');
      expect(list.single.kind, RecordKind.issue);
      expect(list.single.title, 'Delivery issue report');
    });
  });
}
