import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

/// Where the app keeps what it must not lose without a connection: the cached
/// trips, the queue of actions waiting to be sent, and the photos and
/// signatures that go with them.
abstract interface class LocalStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);

  Future<List<int>?> readBytes(String name);
  Future<void> writeBytes(String name, List<int> bytes);
  Future<void> deleteBytes(String name);

  /// Everything: used when a different driver signs in or the driver signs out.
  Future<void> clear();
}

String _safe(String key) => base64Url.encode(utf8.encode(key));

/// Files in the app's private documents folder. A write goes to a temporary
/// file that is then renamed over the real one, so a crash or a flat battery
/// mid-write never leaves half a file where the queue used to be.
class FileLocalStore implements LocalStore {
  FileLocalStore([Future<Directory> Function()? root])
    : _root = root ?? _defaultRoot;

  final Future<Directory> Function() _root;
  Directory? _dir;

  static Future<Directory> _defaultRoot() async =>
      Directory('${(await getApplicationDocumentsDirectory()).path}/waypoint');

  Future<Directory> _sub(String name) async {
    _dir ??= await _root();
    final d = Directory('${_dir!.path}/$name');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<File> _file(String sub, String key) async =>
      File('${(await _sub(sub)).path}/${_safe(key)}');

  Future<void> _put(String sub, String key, List<int> bytes) async {
    final target = await _file(sub, key);
    final tmp = File('${target.path}.tmp');
    await tmp.writeAsBytes(bytes, flush: true);
    await tmp.rename(target.path);
  }

  Future<File?> _existing(String sub, String key) async {
    final f = await _file(sub, key);
    return await f.exists() ? f : null;
  }

  @override
  Future<String?> read(String key) async {
    final f = await _existing('kv', key);
    return f == null ? null : utf8.decode(await f.readAsBytes());
  }

  @override
  Future<void> write(String key, String value) =>
      _put('kv', key, utf8.encode(value));

  @override
  Future<void> delete(String key) async {
    final f = await _existing('kv', key);
    if (f != null) await f.delete();
  }

  @override
  Future<List<int>?> readBytes(String name) async =>
      (await _existing('blobs', name))?.readAsBytes();

  @override
  Future<void> writeBytes(String name, List<int> bytes) =>
      _put('blobs', name, bytes);

  @override
  Future<void> deleteBytes(String name) async {
    final f = await _existing('blobs', name);
    if (f != null) await f.delete();
  }

  @override
  Future<void> clear() async {
    _dir ??= await _root();
    if (await _dir!.exists()) await _dir!.delete(recursive: true);
  }
}

/// For tests, and for the demo data (nothing to survive a restart).
class MemoryLocalStore implements LocalStore {
  final _kv = <String, String>{};
  final _blobs = <String, List<int>>{};

  @override
  Future<String?> read(String key) async => _kv[key];

  @override
  Future<void> write(String key, String value) async => _kv[key] = value;

  @override
  Future<void> delete(String key) async => _kv.remove(key);

  @override
  Future<List<int>?> readBytes(String name) async => _blobs[name];

  @override
  Future<void> writeBytes(String name, List<int> bytes) async =>
      _blobs[name] = bytes;

  @override
  Future<void> deleteBytes(String name) async => _blobs.remove(name);

  @override
  Future<void> clear() async {
    _kv.clear();
    _blobs.clear();
  }

  int get blobCount => _blobs.length;
}

final localStoreProvider = Provider<LocalStore>((_) => FileLocalStore());
