/**
 * Checks the delivery-code hash against the published PBKDF2-HMAC-SHA256 test
 * vectors, so the driver app can be built against the same known answers.
 *
 *   npx ts-node src/modules/trips/trip-codes.check.ts
 */
import * as assert from 'assert';
import {
  hashDeliveryCode,
  matchesDeliveryCode,
  newCode,
  parseDeliveryCodeHash,
  storeDeliveryCodeHash,
} from './trip-codes.util';

// "salt" as hex; password "password"; 32 bytes out.
const SALT = Buffer.from('salt').toString('hex');
const VECTORS: [number, string][] = [
  [1, '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b'],
  [2, 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43'],
  [4096, 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a'],
];

async function check(): Promise<void> {
  for (const [iterations, expected] of VECTORS) {
    const { hash } = await hashDeliveryCode('password', SALT, iterations);
    assert.strictEqual(hash, expected, `PBKDF2 with ${iterations} iterations`);
  }

  const code = newCode();
  assert.match(code, /^\d{6}$/, 'a code is six digits');
  const stored = storeDeliveryCodeHash(await hashDeliveryCode(code));
  assert.ok(parseDeliveryCodeHash(stored), 'the stored form parses back');
  assert.ok(await matchesDeliveryCode(code, stored), 'the right code matches');
  const wrong = code === '000000' ? '000001' : '000000';
  assert.ok(
    !(await matchesDeliveryCode(wrong, stored)),
    'a wrong code does not',
  );
  assert.ok(!(await matchesDeliveryCode(code, 'not-a-hash')), 'nor a bad hash');

  console.log('ok: delivery-code hash matches the PBKDF2-HMAC-SHA256 vectors');
}

void check();
