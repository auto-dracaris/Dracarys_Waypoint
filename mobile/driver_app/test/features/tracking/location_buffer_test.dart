import 'package:driver_app/core/storage/local_store.dart';
import 'package:driver_app/features/tracking/data/location_buffer.dart';
import 'package:driver_app/features/tracking/domain/location_point.dart';
import 'package:flutter_test/flutter_test.dart';

LocationPoint point(int i, {int? heading = 90, double? speed = 30.5}) =>
    LocationPoint(
      id: 'id-$i',
      lat: 6.9 + i / 100000,
      lng: 79.8 + i / 100000,
      heading: heading,
      speedKmh: speed,
      recordedAt: DateTime.utc(
        2026,
        10,
        5,
        3,
        0,
        0,
      ).add(Duration(seconds: 5 * i)),
    );

void main() {
  group('LocationPoint', () {
    test('sends exactly the fields the API lists, time as ISO-8601', () {
      expect(point(1).toApi(), {
        'clientId': 'id-1',
        'lat': 6.90001,
        'lng': 79.80001,
        'heading': 90,
        'speedKmh': 30.5,
        'recordedAt': '2026-10-05T03:00:05.000Z',
      });
    });

    test('leaves out heading and speed the phone could not give', () {
      final json = point(1, heading: null, speed: null).toApi();
      expect(json.containsKey('heading'), isFalse);
      expect(json.containsKey('speedKmh'), isFalse);
      expect(json.keys, containsAll(['clientId', 'lat', 'lng', 'recordedAt']));
    });

    test('survives being stored and read back', () {
      final back = LocationPoint.fromJson(point(7).toJson());
      expect(back.id, 'id-7');
      expect(back.lat, point(7).lat);
      expect(back.heading, 90);
      expect(back.speedKmh, 30.5);
      expect(back.recordedAt, point(7).recordedAt);
      final bare = LocationPoint.fromJson(
        point(7, heading: null, speed: null).toJson(),
      );
      expect(bare.heading, isNull);
      expect(bare.speedKmh, isNull);
    });
  });

  group('LocationBuffer', () {
    test('starts empty', () async {
      final b = LocationBuffer(MemoryLocalStore());
      expect(await b.count(), 0);
      expect(await b.oldest(500), isEmpty);
    });

    test('keeps points in the order they were taken', () async {
      final b = LocationBuffer(MemoryLocalStore());
      for (var i = 0; i < 5; i++) {
        await b.add(point(i));
      }
      expect(await b.count(), 5);
      expect((await b.oldest(500)).map((p) => p.id), [
        'id-0',
        'id-1',
        'id-2',
        'id-3',
        'id-4',
      ]);
    });

    test('hands out the oldest first and no more than asked for', () async {
      final b = LocationBuffer(MemoryLocalStore(), chunkSize: 4);
      for (var i = 0; i < 11; i++) {
        await b.add(point(i));
      }
      final batch = await b.oldest(6);
      expect(batch.map((p) => p.id), [
        'id-0',
        'id-1',
        'id-2',
        'id-3',
        'id-4',
        'id-5',
      ]);
      // Looking does not remove.
      expect(await b.count(), 11);
    });

    test('spreads over chunks and counts without reading them', () async {
      final store = MemoryLocalStore();
      final b = LocationBuffer(store, chunkSize: 3);
      for (var i = 0; i < 8; i++) {
        await b.add(point(i));
      }
      expect(await b.count(), 8);
      // 3 + 3 + 2: three chunks and an index.
      expect(await store.read('loc:1'), isNotNull);
      expect(await store.read('loc:2'), isNotNull);
      expect(await store.read('loc:3'), isNotNull);
      expect(await store.read('loc:4'), isNull);
    });

    test('adding a point rewrites only the newest chunk', () async {
      final store = MemoryLocalStore();
      final b = LocationBuffer(store, chunkSize: 3);
      for (var i = 0; i < 4; i++) {
        await b.add(point(i));
      }
      final firstChunk = await store.read('loc:1');
      await b.add(point(4));
      expect(await store.read('loc:1'), firstChunk); // untouched
    });

    test(
      'removing sent points frees whole chunks and keeps the rest',
      () async {
        final store = MemoryLocalStore();
        final b = LocationBuffer(store, chunkSize: 3);
        for (var i = 0; i < 8; i++) {
          await b.add(point(i));
        }
        await b.remove(['id-0', 'id-1', 'id-2', 'id-3']);

        expect(await b.count(), 4);
        expect((await b.oldest(10)).map((p) => p.id), [
          'id-4',
          'id-5',
          'id-6',
          'id-7',
        ]);
        expect(await store.read('loc:1'), isNull); // emptied chunk is gone
      },
    );

    test('removing everything leaves it empty and usable', () async {
      final b = LocationBuffer(MemoryLocalStore(), chunkSize: 3);
      for (var i = 0; i < 5; i++) {
        await b.add(point(i));
      }
      await b.remove([for (var i = 0; i < 5; i++) 'id-$i']);
      expect(await b.count(), 0);
      await b.add(point(9));
      expect((await b.oldest(10)).single.id, 'id-9');
    });

    test('removing unknown ids changes nothing', () async {
      final b = LocationBuffer(MemoryLocalStore());
      await b.add(point(1));
      await b.remove(['nope']);
      await b.remove([]);
      expect(await b.count(), 1);
    });

    test('points added while others are removed are not lost', () async {
      final b = LocationBuffer(MemoryLocalStore(), chunkSize: 3);
      for (var i = 0; i < 4; i++) {
        await b.add(point(i));
      }
      // Two operations started together must not overwrite each other.
      await Future.wait([
        b.remove(['id-0', 'id-1']),
        b.add(point(10)),
        b.add(point(11)),
      ]);
      final ids = (await b.oldest(100)).map((p) => p.id).toSet();
      expect(ids, {'id-2', 'id-3', 'id-10', 'id-11'});
      expect(await b.count(), 4);
    });

    test(
      'survives a restart: a new buffer over the same storage sees it',
      () async {
        final store = MemoryLocalStore();
        final first = LocationBuffer(store, chunkSize: 3);
        for (var i = 0; i < 5; i++) {
          await first.add(point(i));
        }
        final again = LocationBuffer(store, chunkSize: 3);
        expect(await again.count(), 5);
        await again.add(point(5));
        expect((await again.oldest(100)).map((p) => p.id).last, 'id-5');
      },
    );

    test(
      'a backlog past the cap drops the oldest points, not the newest',
      () async {
        final b = LocationBuffer(
          MemoryLocalStore(),
          chunkSize: 2,
          maxPoints: 5,
        );
        for (var i = 0; i < 12; i++) {
          await b.add(point(i));
        }
        final ids = (await b.oldest(100)).map((p) => p.id).toList();
        expect(ids.last, 'id-11');
        expect(ids.length, lessThanOrEqualTo(6)); // cap, to chunk granularity
        expect(ids.first, isNot('id-0'));
      },
    );

    test('a damaged chunk is skipped instead of jamming the queue', () async {
      final store = MemoryLocalStore();
      final b = LocationBuffer(store, chunkSize: 2);
      for (var i = 0; i < 4; i++) {
        await b.add(point(i));
      }
      await store.write('loc:1', '<<<broken');
      final left = (await b.oldest(100)).map((p) => p.id).toList();
      expect(left, ['id-2', 'id-3']);
    });

    test('a damaged index starts a fresh buffer', () async {
      final store = MemoryLocalStore();
      await store.write('loc:index', 'not json');
      final b = LocationBuffer(store);
      expect(await b.count(), 0);
      await b.add(point(1));
      expect(await b.count(), 1);
    });

    test('wiped when a different driver signs in', () async {
      final store = MemoryLocalStore();
      final b = LocationBuffer(store);
      await b.add(point(1));
      await store.clear();
      expect(await b.count(), 0);
    });
  });
}
