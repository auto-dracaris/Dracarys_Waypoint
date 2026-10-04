import 'dart:io';

import 'package:driver_app/core/storage/local_store.dart';
import 'package:driver_app/core/storage/offline_cache.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FileLocalStore', () {
    late Directory dir;
    late FileLocalStore store;

    setUp(() async {
      dir = await Directory.systemTemp.createTemp('waypoint_store_test');
      store = FileLocalStore(() async => dir);
    });

    tearDown(() async {
      if (await dir.exists()) await dir.delete(recursive: true);
    });

    test('text round-trips, including odd keys and unicode', () async {
      expect(await store.read('trip:1/a b'), isNull);
      await store.write('trip:1/a b', 'Peliyagoda · 4°C');
      expect(await store.read('trip:1/a b'), 'Peliyagoda · 4°C');
    });

    test('a write replaces the old value and delete removes it', () async {
      await store.write('k', 'one');
      await store.write('k', 'two');
      expect(await store.read('k'), 'two');
      await store.delete('k');
      expect(await store.read('k'), isNull);
      await store.delete('k'); // already gone: harmless
    });

    test('bytes round-trip and are kept apart from text', () async {
      await store.writeBytes('photo-1', [1, 2, 3, 255]);
      expect(await store.readBytes('photo-1'), [1, 2, 3, 255]);
      expect(await store.read('photo-1'), isNull);
      await store.deleteBytes('photo-1');
      expect(await store.readBytes('photo-1'), isNull);
    });

    test(
      'a new store on the same folder sees what was saved (a restart)',
      () async {
        await store.write('queue', '[1,2]');
        await store.writeBytes('b', [9]);
        final reopened = FileLocalStore(() async => dir);
        expect(await reopened.read('queue'), '[1,2]');
        expect(await reopened.readBytes('b'), [9]);
      },
    );

    test('no temporary files are left behind', () async {
      await store.write('k', 'v');
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .map((f) => f.path);
      expect(files.where((p) => p.endsWith('.tmp')), isEmpty);
    });

    test('clear removes everything and the store keeps working', () async {
      await store.write('a', '1');
      await store.writeBytes('b', [1]);
      await store.clear();
      expect(await store.read('a'), isNull);
      expect(await store.readBytes('b'), isNull);
      await store.write('a', '2');
      expect(await store.read('a'), '2');
    });
  });

  group('OfflineCache', () {
    test('stores and returns JSON, and nothing for an unknown key', () async {
      final cache = OfflineCache(MemoryLocalStore());
      expect(await cache.getJson('x'), isNull);
      await cache.putJson('x', {
        'a': [1, 2],
      });
      expect(await cache.getJson('x'), {
        'a': [1, 2],
      });
      await cache.remove('x');
      expect(await cache.getJson('x'), isNull);
    });

    test('a damaged entry reads as missing instead of crashing', () async {
      final store = MemoryLocalStore();
      await store.write('c:bad', '{not json');
      expect(await OfflineCache(store).getJson('bad'), isNull);
    });

    test('the same driver keeps their data', () async {
      final store = MemoryLocalStore();
      final cache = OfflineCache(store);
      await cache.bindTo('12');
      await cache.putJson('me', {'id': 12});
      await cache.bindTo('12');
      expect(await cache.getJson('me'), {'id': 12});
    });

    test(
      'a different driver starts clean, queue and photos included',
      () async {
        final store = MemoryLocalStore();
        final cache = OfflineCache(store);
        await cache.bindTo('12');
        await cache.putJson('me', {'id': 12});
        await store.write('queue', '[{"x":1}]');
        await store.writeBytes('photo', [1]);

        await cache.bindTo('99');

        expect(await cache.getJson('me'), isNull);
        expect(await store.read('queue'), isNull);
        expect(await store.readBytes('photo'), isNull);
        // ...and the data now belongs to the new driver.
        await cache.putJson('me', {'id': 99});
        await cache.bindTo('99');
        expect(await cache.getJson('me'), {'id': 99});
      },
    );
  });
}
