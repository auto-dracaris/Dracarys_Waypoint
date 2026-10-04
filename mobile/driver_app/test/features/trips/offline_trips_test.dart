import 'dart:convert';

import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/features/sync/domain/pending_action.dart';
import 'package:driver_app/features/sync/domain/pending_overlay.dart';
import 'package:driver_app/features/trips/data/http_trips_repository.dart';
import 'package:driver_app/features/trips/data/trip_mapper.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/offline_harness.dart';
import '../../support/trip_json.dart';

const hash = {
  'salt': '00112233445566778899aabbccddeeff',
  'iterations': 1000,
  'hash': '5f96a43ec085d7e812c2d0fc4b797107078dce886b2ddcb376e63c5b07cdbac0',
};

const tripId = '11111111-1111-4111-8111-111111111111';

OfflineHarness serve({List<String>? states, String status = 'in_progress'}) {
  return OfflineHarness((req) {
    final path = req.url.path;
    if (path == '/api/trips') {
      return envelope(200, 'ok', {
        'items': [
          {'id': tripId},
        ],
        'meta': {'total': 1},
      });
    }
    if (path == '/api/trips/$tripId' && req.method == 'GET') {
      return envelope(
        200,
        'ok',
        tripJson(
          status: status,
          stopStates: states ?? ['completed', 'pending'],
          codeHash: hash,
        ),
      );
    }
    if (path == '/api/auth/me') {
      return envelope(200, 'ok', {
        'id': 12,
        'firstName': 'Kasun',
        'lastName': 'Perera',
        'phone': '94771234567',
        'role': 'driver',
        'driver': {
          'code': 'DRV-0012',
          'depot': 'Peliyagoda',
          'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
        },
      });
    }
    return envelope(200, 'ok', tripJson());
  });
}

HttpTripsRepository repoOn(OfflineHarness h) => HttpTripsRepository(
  h.api,
  cache: h.cache,
  submitter: h.submitter,
  queue: h.queue,
  now: () => DateTime.utc(2026, 10, 4, 3, 0),
);

void main() {
  group('reading with no signal', () {
    test('a trip seen once is still there offline, hashes and all', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrip(tripId);

      h.online = false;
      final trip = await repo.getTrip(tripId);
      expect(trip.name, 'Trip 7');
      expect(trip.activeStop!.deliveryCode, isNotNull);
      expect(trip.activeStop!.deliveryCode!.iterations, 1000);
      expect(trip.activeStop!.deliveryCode!.salt, hash['salt']);
    });

    test('today list and vehicle come from the cache too', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrips(date: DateTime(2026, 10, 4));
      await repo.getVehicle();

      h.online = false;
      final trips = await repo.getTrips(date: DateTime(2026, 10, 4));
      expect(trips.single.name, 'Trip 7');
      expect((await repo.getVehicle()).plate, 'VEH021');
    });

    test('a day never seen has nothing to fall back on', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrips(date: DateTime(2026, 10, 4));
      h.online = false;
      await expectLater(
        repo.getTrips(date: DateTime(2026, 10, 9)),
        throwsA(
          isA<ApiException>().having((e) => e.isNetwork, 'network', true),
        ),
      );
    });

    test('a server refusal is not hidden behind the cache', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrip(tripId);
      h.respond = (_) => envelope(403, 'This trip is not assigned to you');
      await expectLater(
        repo.getTrip(tripId),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 's', 403)),
      );
    });

    test('the cache is refreshed whenever the server answers', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrip(tripId);
      h.respond = (_) => envelope(200, 'ok', tripJson(planVersion: 5));
      await repo.getTrip(tripId);
      h.online = false;
      expect((await repo.getTrip(tripId)).planVersion, 5);
    });
  });

  group('working with no signal', () {
    test('arriving offline shows the stop as arrived and queues it', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrip(tripId);
      h.online = false;

      final trip = await repo.markArrived(tripId);

      expect(trip.activeStop!.status, StopStatus.arrived);
      expect(trip.activeStop!.arrivedAt, isNotNull);
      final queued = (await h.queue.all()).single;
      expect(queued.kind, ActionKind.arrive);
      expect(queued.stopId, '41');
      expect(queued.body['planVersion'], 2);
      // ...and it stays arrived the next time the screen loads.
      expect(
        (await repo.getTrip(tripId)).activeStop!.status,
        StopStatus.arrived,
      );
    });

    test('arriving twice offline queues it once', () async {
      final h = serve();
      final repo = repoOn(h);
      await repo.getTrip(tripId);
      h.online = false;
      await repo.markArrived(tripId);
      await repo.markArrived(tripId);
      expect(await h.queue.all(), hasLength(1));
    });

    test(
      'completing offline finishes the stop and the trip on the phone',
      () async {
        final h = serve(states: ['completed', 'arrived']);
        final repo = repoOn(h);
        await repo.getTrip(tripId);
        h.online = false;

        final trip = await repo.completeStop(
          tripId,
          '41',
          deliveredCases: {'ORD0000012': 10},
          deliveryCode: '123456',
        );

        expect(trip.status, TripStatus.completed);
        expect(trip.stops.last.status, StopStatus.completed);
        expect(trip.stops.last.orders.single.deliveredCases, 10);
        final queued = (await h.queue.all()).single;
        expect(queued.kind, ActionKind.complete);
        expect(queued.body['deliveredCases'], {'ORD0000012': 10});
        expect(queued.body['deliveryCode'], '123456');
        expect(queued.body['completedAt'], '2026-10-04T03:00:00.000Z');
      },
    );

    test(
      'a whole stop done offline queues arrive then complete in order',
      () async {
        final h = serve();
        final repo = repoOn(h);
        await repo.getTrip(tripId);
        h.online = false;

        await repo.markArrived(tripId);
        await repo.completeStop(tripId, '41');

        expect((await h.queue.all()).map((a) => a.kind), [
          ActionKind.arrive,
          ActionKind.complete,
        ]);
      },
    );

    test('starting a trip needs the server: it is never queued', () async {
      final h = serve(status: 'ready');
      final repo = repoOn(h);
      h.online = false;
      await expectLater(
        repo.startTrip(tripId, otp: '482913'),
        throwsA(isA<ApiException>().having((e) => e.isNetwork, 'n', true)),
      );
      expect(await h.queue.all(), isEmpty);
    });

    test(
      'starting online keeps the delivery-code hashes for the road',
      () async {
        final h = serve(status: 'ready');
        h.respond = (req) => req.url.path.endsWith('/start')
            ? envelope(200, 'ok', tripJson(codeHash: hash))
            : envelope(200, 'ok');
        final repo = repoOn(h);
        final started = await repo.startTrip(tripId, otp: '482913');
        expect(started.activeStop!.deliveryCode, isNotNull);

        h.online = false;
        expect(
          (await repo.getTrip(tripId)).activeStop!.deliveryCode,
          isNotNull,
        );
      },
    );
  });

  group('applyPending', () {
    PendingAction act(
      ActionKind kind,
      String stop, {
      Map<String, Object?> body = const {},
      ActionState state = ActionState.pending,
    }) => PendingAction(
      id: '$kind$stop',
      kind: kind,
      tripId: tripId,
      stopId: stop,
      createdAt: DateTime.utc(2026, 10, 4, 3),
      body: body,
      state: state,
    );

    Trip base([List<String>? s]) => tripFromJson(
      tripJson(stopStates: s ?? ['completed', 'pending', 'pending']),
    );

    test('leaves the trip alone with nothing waiting', () {
      expect(applyPending(base(), const []).activeStop!.id, '41');
    });

    test('other trips actions are ignored', () {
      final other = PendingAction(
        id: 'x',
        kind: ActionKind.arrive,
        tripId: 'someone-else',
        stopId: '41',
        createdAt: DateTime.utc(2026),
        body: const {},
      );
      expect(
        applyPending(base(), [other]).activeStop!.status,
        StopStatus.pending,
      );
    });

    test('refused actions are not applied', () {
      final trip = applyPending(base(), [
        act(ActionKind.arrive, '41', state: ActionState.rejected),
      ]);
      expect(trip.activeStop!.status, StopStatus.pending);
    });

    test('arrive uses the time the driver arrived', () {
      final trip = applyPending(base(), [
        act(
          ActionKind.arrive,
          '41',
          body: {'arrivedAt': '2026-10-04T02:12:00.000Z'},
        ),
      ]);
      expect(
        trip.activeStop!.arrivedAt!.toUtc(),
        DateTime.utc(2026, 10, 4, 2, 12),
      );
    });

    test('only the last completion finishes the trip', () {
      final trip = applyPending(base(), [
        act(ActionKind.arrive, '41'),
        act(ActionKind.complete, '41'),
      ]);
      expect(trip.status, TripStatus.inProgress);
      expect(trip.activeStop!.id, '42');
      final done = applyPending(base(), [
        act(ActionKind.arrive, '41'),
        act(ActionKind.complete, '41'),
        act(ActionKind.arrive, '42'),
        act(ActionKind.complete, '42'),
      ]);
      expect(done.status, TripStatus.completed);
    });

    test(
      'completing a stop the server already has as done changes nothing',
      () {
        final trip = tripFromJson(
          tripJson(stopStates: ['completed', 'completed']),
        );
        final after = applyPending(trip, [
          act(ActionKind.complete, '41', body: const {}),
        ]);
        expect(
          after.stops.map((s) => s.status),
          everyElement(StopStatus.completed),
        );
      },
    );

    test('a pending trip is never promoted to completed by an empty list', () {
      expect(
        applyPending(base(['pending']), const []).status,
        TripStatus.inProgress,
      );
    });
  });

  test('the cached JSON is the API JSON, so it survives a round trip', () {
    final decoded = jsonDecode(jsonEncode(tripJson(codeHash: hash)));
    final trip = tripFromJson(decoded as Map<String, dynamic>);
    expect(trip.activeStop!.deliveryCode!.hash, hash['hash']);
  });
}
