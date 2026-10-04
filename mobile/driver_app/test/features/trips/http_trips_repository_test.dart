import 'dart:convert';

import 'package:driver_app/core/api/api_exception.dart';
import 'package:driver_app/features/trips/data/http_trips_repository.dart';
import 'package:driver_app/features/trips/domain/order.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart';
import '../../support/trip_json.dart';

({HttpTripsRepository repo, List<http.Request> sent, OfflineHarness h}) build(
  http.Response Function(http.Request) respond,
) {
  final h = OfflineHarness(respond);
  return (
    repo: HttpTripsRepository(
      h.api,
      cache: h.cache,
      submitter: h.submitter,
      queue: h.queue,
      now: () => DateTime.utc(2026, 10, 4, 3, 0),
    ),
    sent: h.sent,
    h: h,
  );
}

void main() {
  test('getTrip maps a trip with its stops and orders', () async {
    final t = build((_) => envelope(200, 'ok', tripJson()));
    final trip = await t.repo.getTrip('x');

    expect(trip.name, 'Trip 7');
    expect(trip.status, TripStatus.inProgress);
    expect(trip.planVersion, 2);
    expect(trip.stops.map((s) => s.status), [
      StopStatus.completed,
      StopStatus.pending,
    ]);
    expect(trip.activeStop!.id, '41');

    final first = trip.stops.first;
    expect(first.lat, 7.1);
    expect(first.distanceKm, 7.2); // decimals may arrive as strings
    expect(first.deliveryWindow, '08:00-10:00');
    expect(first.orders.single.id, 'ORD0000012');
    expect(first.orders.single.temperature, Temperature.chilled);
    expect(first.orders.single.handling, 'Keep below 4°C');
  });

  test('an outlet without coordinates falls back instead of failing', () async {
    final t = build((_) => envelope(200, 'ok', tripJson()));
    final second = (await t.repo.getTrip('x')).stops[1];
    expect(second.lat, isNot(0));
    expect(second.lng, isNot(0));
  });

  test('each API status maps to a trip status', () async {
    const expected = {
      'assigned': TripStatus.assigned,
      'loading': TripStatus.loading,
      'ready': TripStatus.ready,
      'in_progress': TripStatus.inProgress,
      'completed': TripStatus.completed,
    };
    for (final e in expected.entries) {
      final t = build((_) => envelope(200, 'ok', tripJson(status: e.key)));
      expect((await t.repo.getTrip('x')).status, e.value, reason: e.key);
    }
  });

  test(
    'getTrips asks for the chosen day and loads each trip in full',
    () async {
      final t = build((req) {
        if (req.url.path.endsWith('/trips')) {
          return envelope(200, 'ok', {
            'items': [
              {'id': 'a'},
              {'id': 'b'},
            ],
            'meta': {'total': 2},
          });
        }
        return envelope(200, 'ok', tripJson());
      });

      final trips = await t.repo.getTrips(date: DateTime(2026, 10, 3));
      expect(trips, hasLength(2));
      expect(t.sent.first.url.queryParameters['date'], '2026-10-03');
      expect(t.sent.map((r) => r.url.path), contains('/api/trips/a'));
      expect(t.sent.map((r) => r.url.path), contains('/api/trips/b'));
    },
  );

  test(
    'startTrip sends the start code, a clientId and the handset clock',
    () async {
      final t = build((_) => envelope(200, 'ok', tripJson()));
      await t.repo.startTrip('trip-1', otp: '482913');

      final req = t.sent.single;
      expect(req.method, 'POST');
      expect(req.url.path, '/api/trips/trip-1/start');
      final body = jsonDecode(req.body) as Map<String, dynamic>;
      expect(body['otp'], '482913');
      expect(body['startedAt'], '2026-10-04T03:00:00.000Z');
      expect(body['clientId'], matches(RegExp(r'^[0-9a-f-]{36}$')));
    },
  );

  test('markArrived posts to the active stop with the plan version', () async {
    final t = build((req) => envelope(200, 'ok', tripJson()));
    await t.repo.markArrived('trip-1');

    final post = t.h.posts.last;
    expect(post.method, 'POST');
    expect(post.url.path, '/api/trips/trip-1/stops/41/arrive');
    final body = jsonDecode(post.body) as Map<String, dynamic>;
    expect(body['planVersion'], 2);
    expect(body['arrivedAt'], '2026-10-04T03:00:00.000Z');
  });

  test('markArrived does nothing when the stop has already arrived', () async {
    final t = build(
      (_) =>
          envelope(200, 'ok', tripJson(stopStates: ['completed', 'arrived'])),
    );
    await t.repo.markArrived('trip-1');
    expect(t.sent.where((r) => r.method == 'POST'), isEmpty);
  });

  test(
    'completeStop sends cases per order reference and the delivery code',
    () async {
      final t = build(
        (_) =>
            envelope(200, 'ok', tripJson(stopStates: ['completed', 'arrived'])),
      );
      await t.repo.completeStop(
        'trip-1',
        '41',
        deliveredCases: {'ORD0000012': 10},
        deliveryCode: '123456',
      );

      final post = t.h.posts.last;
      expect(post.url.path, '/api/trips/trip-1/stops/41/complete');
      final body = jsonDecode(post.body) as Map<String, dynamic>;
      expect(body['deliveredCases'], {'ORD0000012': 10});
      expect(body['deliveryCode'], '123456');
      expect(body['planVersion'], 2);
    },
  );

  test('a stale plan comes back as a 409 carrying the current trip', () async {
    final t = build(
      (req) => req.method == 'GET'
          ? envelope(200, 'ok', tripJson(stopStates: ['completed', 'arrived']))
          : envelope(409, 'The stop order has changed', tripJson()),
    );
    await expectLater(
      t.repo.completeStop('trip-1', '41'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'status', 409)
            .having((e) => e.data, 'data', isA<Map>()),
      ),
    );
  });
}
