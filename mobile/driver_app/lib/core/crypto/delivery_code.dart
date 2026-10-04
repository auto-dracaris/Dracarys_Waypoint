import 'dart:convert';
import 'dart:isolate';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/trips/domain/delivery_code_hash.dart';

List<int> _fromHex(String hex) => [
  for (var i = 0; i + 1 < hex.length; i += 2)
    int.parse(hex.substring(i, i + 2), radix: 16),
];

String _toHex(List<int> bytes) =>
    bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

/// PBKDF2-HMAC-SHA256, the same derivation the API uses to hash a delivery
/// code (`trip-codes.util.ts`): one 32-byte block, so a single pass.
List<int> pbkdf2Sha256(List<int> password, List<int> salt, int iterations) {
  final hmac = Hmac(sha256, password);
  var u = hmac.convert([...salt, 0, 0, 0, 1]).bytes;
  final t = List<int>.of(u);
  for (var i = 1; i < iterations; i++) {
    u = hmac.convert(u).bytes;
    for (var j = 0; j < t.length; j++) {
      t[j] ^= u[j];
    }
  }
  return t;
}

/// Whether [code] is the code that [expected] was made from. Comparing every
/// byte regardless of where they first differ keeps the time taken from hinting
/// at how close a guess was.
bool codeMatches(String code, DeliveryCodeHash expected) {
  final derived = _toHex(
    pbkdf2Sha256(
      utf8.encode(code),
      _fromHex(expected.salt),
      expected.iterations,
    ),
  );
  if (derived.length != expected.hash.length) return false;
  var diff = 0;
  for (var i = 0; i < derived.length; i++) {
    diff |= derived.codeUnitAt(i) ^ expected.hash.toLowerCase().codeUnitAt(i);
  }
  return diff == 0;
}

typedef DeliveryCodeVerifier = Future<bool> Function(
  String code,
  DeliveryCodeHash expected,
);

/// 150,000 rounds take a moment, so the check runs on its own isolate and the
/// screen stays responsive.
final deliveryCodeVerifierProvider = Provider<DeliveryCodeVerifier>(
  (_) =>
      (code, expected) => Isolate.run(() => codeMatches(code, expected)),
);
