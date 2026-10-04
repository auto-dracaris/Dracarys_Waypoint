import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'local_store.dart';

/// JSON snapshots of what the API last said (trips, the driver's profile, a
/// route change, a drawn road), kept so the app still has something to show
/// with no signal. Cached values are the API's own JSON, so reading one back
/// goes through the same mappers as a live reply.
///
/// The cache belongs to one driver: [bindTo] wipes it, and the queue of
/// unsent actions, when a different driver signs in, so nothing leaks between
/// accounts that share a phone.
class OfflineCache {
  OfflineCache(this._store);

  final LocalStore _store;

  static const _ownerKey = 'owner';

  Future<void> putJson(String key, Object? value) =>
      _store.write('c:$key', jsonEncode(value));

  /// Null when nothing is cached under [key] (or it cannot be read).
  Future<Object?> getJson(String key) async {
    final raw = await _store.read('c:$key');
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  Future<void> remove(String key) => _store.delete('c:$key');

  /// Makes the stored data this driver's. If it was another driver's, it is
  /// wiped first.
  Future<void> bindTo(String driverId) async {
    final owner = await _store.read(_ownerKey);
    if (owner != null && owner != driverId) await _store.clear();
    if (owner != driverId) await _store.write(_ownerKey, driverId);
  }

  /// Forget everything (sign out).
  Future<void> clear() => _store.clear();
}

final offlineCacheProvider = Provider<OfflineCache>(
  (ref) => OfflineCache(ref.watch(localStoreProvider)),
);
