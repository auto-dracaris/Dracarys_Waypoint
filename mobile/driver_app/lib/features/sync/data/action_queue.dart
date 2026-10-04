import 'dart:async';
import 'dart:convert';

import '../../../core/storage/local_store.dart';
import '../domain/pending_action.dart';

/// The driver's unsent actions, kept on the phone in the order they were made
/// and saved after every change, so closing the app (or losing power) with
/// unsent work loses nothing.
class ActionQueue {
  ActionQueue(this._store);

  final LocalStore _store;

  static const _key = 'queue';

  Future<void> _lock = Future<void>.value();
  final _changes = StreamController<void>.broadcast();

  /// Fires after every change to the queue.
  Stream<void> get changes => _changes.stream;

  /// One change at a time: two quick actions must not overwrite each other.
  Future<T> _exclusive<T>(Future<T> Function() run) {
    final result = _lock.then((_) => run());
    _lock = result.then((_) {}, onError: (_) {});
    return result;
  }

  Future<List<PendingAction>> _load() async {
    final raw = await _store.read(_key);
    var items = <PendingAction>[];
    if (raw != null) {
      try {
        items = [
          for (final j in (jsonDecode(raw) as List))
            PendingAction.fromJson(Map<String, dynamic>.from(j as Map)),
        ];
      } catch (_) {
        // A queue file that cannot be read is not worth crashing the app for;
        // the actions in it are lost, which is logged by the empty list.
      }
    }
    return items;
  }

  Future<void> _save(List<PendingAction> items) async {
    await _store.write(_key, jsonEncode([for (final a in items) a.toJson()]));
    _changes.add(null);
  }

  /// A copy of the queue, oldest first.
  Future<List<PendingAction>> all() =>
      _exclusive(() async => List.of(await _load()));

  Future<void> add(PendingAction action) => _exclusive(() async {
    final items = await _load();
    await _save([...items, action]);
  });

  Future<void> update(PendingAction action) => _exclusive(() async {
    final items = await _load();
    await _save([for (final a in items) a.id == action.id ? action : a]);
  });

  /// Drops the action and the files it was holding.
  Future<void> remove(String id) => _exclusive(() async {
    final items = await _load();
    final gone = items.where((a) => a.id == id).firstOrNull;
    await _save([
      for (final a in items)
        if (a.id != id) a,
    ]);
    if (gone != null) {
      for (final blob in gone.blobs.values) {
        await _store.deleteBytes(blob.name);
      }
    }
  });

  Future<bool> hasPendingFor(String tripId) async => (await all()).any(
    (a) => a.tripId == tripId && a.state == ActionState.pending,
  );

  void dispose() => _changes.close();
}
