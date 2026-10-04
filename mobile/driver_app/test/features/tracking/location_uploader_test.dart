import 'dart:convert';

import 'package:driver_app/features/tracking/data/location_uploader.dart';
import 'package:driver_app/features/tracking/domain/location_point.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../support/offline_harness.dart';

List<LocationPoint> points(int n, {int from = 0}) => [
  for (var i = from; i < from + n; i++)
    LocationPoint(
      id: 'p$i',
      lat: 6.9 + i / 1e5,
      lng: 79.8,
      speedKmh: 30,
      recordedAt: DateTime.utc(2026, 10, 5, 3).add(Duration(seconds: i * 5)),
    ),
];

List<String> sentIds(http.Request r) => [
  for (final p in (jsonDecode(r.body)['points'] as List))
    (p as Map)['clientId'] as String,
];

http.Response accepted(int n) =>
    envelope(202, 'Locations queued', {'received': n});

({LocationUploader up, OfflineHarness h}) build(
  http.Response Function(http.Request) respond,
) {
  final h = OfflineHarness(respond);
  return (up: LocationUploader(h.api), h: h);
}

void main() {
  test(
    'posts the batch to the vehicle and everything in it is finished on 202',
    () async {
      final t = build((r) => accepted(sentIds(r).length));
      final res = await t.up.upload(21, points(3));

      expect(res.status, UploadStatus.ok);
      expect(res.finished, ['p0', 'p1', 'p2']);
      final req = t.h.posts.single;
      expect(req.url.path, '/api/vehicles/21/locations');
      expect(req.headers['Authorization'], 'Bearer A1');
      expect(sentIds(req), ['p0', 'p1', 'p2']);
    },
  );

  test('uses the numeric vehicle id, and sends only listed fields', () async {
    final t = build((r) => accepted(1));
    await t.up.upload(1, points(1));
    final body = jsonDecode(t.h.posts.single.body) as Map;
    expect(body.keys, ['points']);
    expect((body['points'] as List).single.keys.toSet(), {
      'clientId',
      'lat',
      'lng',
      'speedKmh',
      'recordedAt',
    });
  });

  test('an empty batch is not sent', () async {
    final t = build((r) => accepted(0));
    final res = await t.up.upload(21, []);
    expect(res.status, UploadStatus.ok);
    expect(res.finished, isEmpty);
    expect(t.h.sent, isEmpty);
  });

  group('invalid points (400)', () {
    test(
      'the bad point is isolated and dropped, the good ones are sent',
      () async {
        // The server refuses any batch that contains p6.
        final t = build(
          (r) => sentIds(r).contains('p6')
              ? envelope(400, 'lat must be a latitude')
              : accepted(sentIds(r).length),
        );
        final res = await t.up.upload(21, points(10));

        expect(res.status, UploadStatus.ok);
        // Everything is finished: nine accepted, one thrown away as invalid.
        expect(res.finished.toSet(), {for (var i = 0; i < 10; i++) 'p$i'});
        // Nothing was sent twice and p6 was never accepted.
        final taken = <String>[];
        for (final r in t.h.posts) {
          final ids = sentIds(r);
          if (!ids.contains('p6')) taken.addAll(ids);
        }
        expect(taken.toSet(), {
          for (var i = 0; i < 10; i++)
            if (i != 6) 'p$i',
        });
        expect(taken.length, 9);
      },
    );

    test('a single refused point is dropped', () async {
      final t = build((r) => envelope(400, 'clientId must be a UUID'));
      final res = await t.up.upload(21, points(1));
      expect(res.status, UploadStatus.ok);
      expect(res.finished, ['p0']);
      expect(t.h.posts, hasLength(1)); // not retried unchanged
    });

    test(
      'it finds the bad point in a few rounds, not one call per point',
      () async {
        final t = build(
          (r) => sentIds(r).contains('p40')
              ? envelope(400, 'bad')
              : accepted(sentIds(r).length),
        );
        await t.up.upload(21, points(100));
        expect(t.h.posts.length, lessThan(20));
      },
    );

    test('if the signal goes while splitting, what was sent is finished and '
        'the rest stays', () async {
      var calls = 0;
      final t = build((r) {
        calls++;
        if (calls == 1) return envelope(400, 'bad');
        if (calls == 2) return accepted(2); // first half
        throw http.ClientException('dropped');
      });
      final res = await t.up.upload(21, points(4));
      expect(res.status, UploadStatus.retryLater);
      expect(res.finished, ['p0', 'p1']); // only the half the server took
    });
  });

  group('failures that keep the points', () {
    test('no signal', () async {
      final t = build((r) => accepted(1));
      t.h.online = false;
      final res = await t.up.upload(21, points(2));
      expect(res.status, UploadStatus.retryLater);
      expect(res.finished, isEmpty);
    });

    test('503: the server could not queue the batch', () async {
      final t = build((r) => envelope(503, 'Could not queue'));
      final res = await t.up.upload(21, points(2));
      expect(res.status, UploadStatus.retryLater);
      expect(res.finished, isEmpty);
    });

    test('401 that a refresh cannot fix', () async {
      final t = build(
        (r) => r.url.path.endsWith('/refresh')
            ? envelope(401, 'Refresh token revoked')
            : envelope(401, 'Unauthorized'),
      );
      final res = await t.up.upload(21, points(2));
      expect(res.status, UploadStatus.retryLater);
      expect(res.finished, isEmpty);
    });

    test('401 is refreshed and the same batch goes again', () async {
      var chats = 0;
      final t = build((r) {
        if (r.url.path.endsWith('/refresh')) {
          return envelope(200, 'ok', {
            'accessToken': 'A2',
            'refreshToken': 'R2',
          });
        }
        return ++chats == 1 ? envelope(401, 'expired') : accepted(2);
      });
      final res = await t.up.upload(21, points(2));
      expect(res.status, UploadStatus.ok);
      expect(res.finished, ['p0', 'p1']);
      expect(t.h.posts.last.headers['Authorization'], 'Bearer A2');
    });

    test('403 and 404: not the driver of that vehicle (any more)', () async {
      for (final status in [403, 404]) {
        final t = build((r) => envelope(status, 'no'));
        final res = await t.up.upload(21, points(2));
        expect(res.status, UploadStatus.vehicleRejected, reason: '$status');
        expect(res.finished, isEmpty, reason: '$status');
      }
    });

    test('an unexpected status keeps the points too', () async {
      final t = build((r) => envelope(500, 'boom'));
      final res = await t.up.upload(21, points(2));
      expect(res.status, UploadStatus.retryLater);
      expect(res.finished, isEmpty);
    });
  });

  test('a limit of 500 points per request', () {
    expect(LocationUploader.maxBatch, 500);
  });
}
