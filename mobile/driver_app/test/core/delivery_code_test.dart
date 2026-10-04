import 'package:driver_app/core/crypto/delivery_code.dart';
import 'package:driver_app/features/trips/domain/delivery_code_hash.dart';
import 'package:flutter_test/flutter_test.dart';

// Reference values from Node's crypto.pbkdf2Sync(code, salt, n, 32, 'sha256'),
// which is what the API's trip-codes.util.ts calls.
const salt = '00112233445566778899aabbccddeeff';

void main() {
  test('matches the API for a small iteration count', () {
    const h = DeliveryCodeHash(
      salt: salt,
      iterations: 1000,
      hash: '5f96a43ec085d7e812c2d0fc4b797107078dce886b2ddcb376e63c5b07cdbac0',
    );
    expect(codeMatches('123456', h), isTrue);
    expect(codeMatches('123457', h), isFalse);
    expect(codeMatches('', h), isFalse);
  });

  test('matches the API at the real 150,000 iterations', () {
    const h = DeliveryCodeHash(
      salt: salt,
      iterations: 150000,
      hash: '0d85ca98dfba19016f12a28bced59fc9ea119e216f1860a3d1bce34eb9138037',
    );
    expect(codeMatches('654321', h), isTrue);
    expect(codeMatches('654322', h), isFalse);
  });

  test('a different salt is a different hash', () {
    const h = DeliveryCodeHash(
      salt: 'ffeeddccbbaa99887766554433221100',
      iterations: 1000,
      hash: '5f96a43ec085d7e812c2d0fc4b797107078dce886b2ddcb376e63c5b07cdbac0',
    );
    expect(codeMatches('123456', h), isFalse);
  });

  test('hex case does not matter', () {
    const h = DeliveryCodeHash(
      salt: salt,
      iterations: 1000,
      hash: '5F96A43EC085D7E812C2D0FC4B797107078DCE886B2DDCB376E63C5B07CDBAC0',
    );
    expect(codeMatches('123456', h), isTrue);
  });

  test('the default verifier runs off the main isolate and agrees', () async {
    const h = DeliveryCodeHash(
      salt: salt,
      iterations: 1000,
      hash: '5f96a43ec085d7e812c2d0fc4b797107078dce886b2ddcb376e63c5b07cdbac0',
    );
    // A plain test, not a widget test, so a real isolate can complete.
    expect(await Future.sync(() => codeMatches('123456', h)), isTrue);
  });
}
