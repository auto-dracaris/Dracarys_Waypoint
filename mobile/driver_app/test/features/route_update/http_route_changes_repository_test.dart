import 'dart:convert';

import 'package:driver_app/features/records/data/http_records_repository.dart';
import 'package:driver_app/features/records/domain/saved_record.dart';
import 'package:driver_app/features/route_update/data/http_route_changes_repository.dart';
import 'package:driver_app/features/route_update/domain/route_change.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart' hide envelope;

http.Response envelope(int status, String message, [Object? data]) =>
    http.Response(
      jsonEncode({'statusCode': status, 'message': message, 'data': data}),
      status,
      headers: {'content-type': 'application/json'},
    );

OfflineHarness apiWith(
  http.Response Function(http.Request) respond, [
  List<http.Request>? sent,
]) =>
    OfflineHarness((req) {
      sent?.add(req);
      return respond(req);
    });

HttpRouteChangesRepository routeRepo(OfflineHarness h) =>
    HttpRouteChangesRepository(h.api,
        cache: h.cache, submitter: h.submitter, queue: h.queue);

HttpRecordsRepository recordsRepo(OfflineHarness h) =>
    HttpRecordsRepository(h.api, cache: h.cache, queue: h.queue);

/// `TripsService.toRouteChangeView`.
Map<String, dynamic> changeJson({bool acknowledged = false}) => {
  'tripId': 'trip-1',
  'planVersion': 3,
  'updatedAt': '2026-10-04T02:00:00.000Z',
  'reason': 'Mall access restricted until 08:00',
  'previous': [
    {
      'name': 'Keells',
      'area': 'Wattala',
      'completed': true,
      'movement': 'none',
    },
    {'name': 'Fresh', 'area': 'Ja-Ela', 'completed': false, 'movement': 'none'},
    {'name': 'Mall', 'area': 'Gampaha', 'completed': false, 'movement': 'none'},
  ],
  'updated': [
    {
      'name': 'Keells',
      'area': 'Wattala',
      'completed': true,
      'movement': 'none',
    },
    {'name': 'Mall', 'area': 'Gampaha', 'completed': false, 'movement': 'up'},
    {'name': 'Fresh', 'area': 'Ja-Ela', 'completed': false, 'movement': 'down'},
  ],
  'impactStopName': 'Fresh',
  'impactArrivalNow': '2026-10-04T02:25:00.000Z',
  'impactArrivalWas': '2026-10-04T02:10:00.000Z',
  'tightWindow': 'Window closes 08:00',
  'acknowledged': acknowledged,
};

void main() {
  group('route changes', () {
    test('maps the change with movements and arrival times', () async {
      final repo = routeRepo(apiWith((_) => envelope(200, 'ok', changeJson())),
      );
      final change = (await repo.get('trip-1'))!;

      expect(change.planVersion, 3);
      expect(change.reason, 'Mall access restricted until 08:00');
      expect(change.updated.map((s) => s.movement), [
        StopMovement.none,
        StopMovement.up,
        StopMovement.down,
      ]);
      expect(change.previous.first.completed, isTrue);
      expect(change.updated[1].area, 'Gampaha');
      expect(change.impactStopName, 'Fresh');
      expect(change.impactArrivalNow, isNot(change.impactArrivalWas));
      expect(change.tightWindow, 'Window closes 08:00');
      expect(change.acknowledged, isFalse);
    });

    test('no change is null', () async {
      final repo = routeRepo(apiWith((_) => envelope(200, 'No route change', null)),
      );
      expect(await repo.get('trip-1'), isNull);
    });

    test(
      'acknowledging posts a clientId and returns the acknowledged change',
      () async {
        final sent = <http.Request>[];
        final repo = routeRepo(apiWith(
            (_) => envelope(200, 'ok', changeJson(acknowledged: true)),
            sent,
          ),
        );
        final change = await repo.acknowledge('trip-1');

        expect(change.acknowledged, isTrue);
        expect(
          sent.last.url.path,
          '/api/trips/trip-1/route-change/acknowledge',
        );
        expect(
          (jsonDecode(sent.last.body) as Map)['clientId'],
          matches(RegExp(r'^[0-9a-f-]{36}$')),
        );
      },
    );

    test('acknowledging a trip with no change is a StateError', () async {
      final repo = routeRepo(apiWith((_) => envelope(404, 'This trip has no route change')),
      );
      await expectLater(repo.acknowledge('trip-1'), throwsStateError);
    });
  });

  group('records', () {
    test(
      'maps the trip\'s records, newest first as the server sends them',
      () async {
        final sent = <http.Request>[];
        final repo = recordsRepo(apiWith((_) {
            return envelope(200, 'ok', {
              'items': [
                {
                  'id': 'p1',
                  'kind': 'proof',
                  'title': 'Proof of delivery · Fresh',
                  'savedAt': '2026-10-04T02:30:00.000Z',
                  'syncState': 'synced',
                },
                {
                  'id': 'trip-1:41',
                  'kind': 'arrival',
                  'title': 'Arrived at Fresh',
                  'savedAt': '2026-10-04T02:12:00.000Z',
                  'syncState': 'synced',
                },
                {
                  'id': 'i1',
                  'kind': 'issue',
                  'title': 'Damaged goods · ORD0000012',
                  'savedAt': '2026-10-04T02:20:00.000Z',
                  'syncState': 'synced',
                },
              ],
              'meta': {'total': 3},
            });
          }, sent),
        );

        final list = await repo.list('trip-1');
        expect(list.map((r) => r.kind), [
          RecordKind.proof,
          RecordKind.issue,
          RecordKind.arrival,
        ]);
        expect(list.first.tripId, 'trip-1');
        expect(list.every((r) => r.syncState == SyncState.synced), isTrue);
        expect(sent.single.url.path, '/api/trips/trip-1/records');
      },
    );

    test(
      'add does nothing: the actions themselves create the records',
      () async {
        final sent = <http.Request>[];
        final repo = recordsRepo(apiWith((_) => envelope(200, 'ok'), sent),
        );
        await repo.add(
          SavedRecord(
            id: 'x',
            tripId: 'trip-1',
            kind: RecordKind.arrival,
            title: 't',
            savedAt: DateTime(2026),
            syncState: SyncState.synced,
          ),
        );
        expect(sent, isEmpty);
      },
    );
  });
}
