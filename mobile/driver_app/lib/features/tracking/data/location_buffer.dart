import 'dart:convert';

import '../../../core/storage/local_store.dart';
import '../domain/location_point.dart';

/// The vehicle's points that have not reached the server yet, on the phone.
///
/// A point is taken every few seconds, so appending must stay cheap however
/// long the backlog: points are kept in chunks of [chunkSize], and adding one
/// rewrites only the newest chunk. An index lists the chunks (oldest first) with
/// how many points each holds, so counting never reads them.
///
/// Points leave only through [remove], which the sender calls after the server
/// has accepted them.
class LocationBuffer {
  LocationBuffer(this._store, {this.chunkSize = 100, this.maxPoints = 100000});

  final LocalStore _store;
  final int chunkSize;

  /// A safety cap on a backlog that never gets sent: past it the oldest points
  /// are dropped (a day of 5-second points is about 17,000).
  final int maxPoints;

  static const _indexKey = 'loc:index';

  Future<void> _lock = Future<void>.value();

  Future<T> _exclusive<T>(Future<T> Function() run) {
    final result = _lock.then((_) => run());
    _lock = result.then((_) {}, onError: (_) {});
    return result;
  }

  // The index is {"next": 3, "chunks": [{"id": 1, "n": 100}, {"id": 2, "n": 41}]}
  Future<({int next, List<({int id, int n})> chunks})> _index() async {
    final raw = await _store.read(_indexKey);
    if (raw == null) return (next: 1, chunks: <({int id, int n})>[]);
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return (
        next: (j['next'] as num).toInt(),
        chunks: [
          for (final c in (j['chunks'] as List))
            (id: ((c as Map)['id'] as num).toInt(), n: (c['n'] as num).toInt()),
        ],
      );
    } catch (_) {
      return (next: 1, chunks: <({int id, int n})>[]);
    }
  }

  Future<void> _writeIndex(int next, List<({int id, int n})> chunks) =>
      _store.write(
        _indexKey,
        jsonEncode({
          'next': next,
          'chunks': [
            for (final c in chunks) {'id': c.id, 'n': c.n},
          ],
        }),
      );

  Future<List<LocationPoint>> _read(int id) async {
    final raw = await _store.read('loc:$id');
    if (raw == null) return [];
    try {
      return [
        for (final p in (jsonDecode(raw) as List))
          LocationPoint.fromJson(Map<String, dynamic>.from(p as Map)),
      ];
    } catch (_) {
      return []; // a damaged chunk is lost, not allowed to jam the queue
    }
  }

  Future<void> _write(int id, List<LocationPoint> points) =>
      _store.write('loc:$id', jsonEncode([for (final p in points) p.toJson()]));

  Future<void> add(LocationPoint point) => _exclusive(() async {
    var (:next, :chunks) = await _index();
    chunks = [...chunks];
    if (chunks.isEmpty || chunks.last.n >= chunkSize) {
      chunks.add((id: next++, n: 0));
    }
    final last = chunks.removeLast();
    final points = [...await _read(last.id), point];
    await _write(last.id, points);
    chunks.add((id: last.id, n: points.length));

    var total = chunks.fold<int>(0, (s, c) => s + c.n);
    while (total > maxPoints && chunks.length > 1) {
      final oldest = chunks.removeAt(0);
      await _store.delete('loc:${oldest.id}');
      total -= oldest.n;
    }
    await _writeIndex(next, chunks);
  });

  /// How many points are waiting.
  Future<int> count() async =>
      (await _index()).chunks.fold<int>(0, (s, c) => s + c.n);

  /// Up to [max] points, oldest first. They stay stored until [remove].
  Future<List<LocationPoint>> oldest(int max) => _exclusive(() async {
    final out = <LocationPoint>[];
    for (final c in (await _index()).chunks) {
      if (out.length >= max) break;
      out.addAll(await _read(c.id));
    }
    return out.length > max ? out.sublist(0, max) : out;
  });

  /// Forgets the points with these ids (the server has them).
  Future<void> remove(Iterable<String> ids) => _exclusive(() async {
    final gone = ids.toSet();
    if (gone.isEmpty) return;
    final index = await _index();
    final kept = <({int id, int n})>[];
    var left = gone.length;
    for (final c in index.chunks) {
      if (left == 0) {
        kept.add(c);
        continue;
      }
      final points = await _read(c.id);
      final remaining = [
        for (final p in points)
          if (!gone.contains(p.id)) p,
      ];
      left -= points.length - remaining.length;
      if (remaining.isEmpty) {
        await _store.delete('loc:${c.id}');
      } else {
        if (remaining.length != points.length) {
          await _write(c.id, remaining);
        }
        kept.add((id: c.id, n: remaining.length));
      }
    }
    await _writeIndex(index.next, kept);
  });
}
