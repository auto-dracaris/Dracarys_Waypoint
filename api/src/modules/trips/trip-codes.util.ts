import { pbkdf2, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const derive = promisify(pbkdf2);

/**
 * The hash of a delivery code that a driver's handset can check without a
 * connection. It has to be something both this API and the app compute the
 * same way, so it is plain PBKDF2:
 *
 *   PBKDF2-HMAC-SHA256(password = the code's digits as UTF-8,
 *                      salt     = the salt's 16 bytes (sent as hex),
 *                      iterations, 32 bytes out) -> hex
 *
 * The many iterations are what stand between someone holding the hash and
 * simply trying all million codes.
 */
export const DELIVERY_CODE_ITERATIONS = 150_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

export interface DeliveryCodeHash {
  salt: string;
  iterations: number;
  hash: string;
}

/** A 6-digit code, from the system's secure random source. */
export const newCode = (): string => String(randomInt(100_000, 1_000_000));

export async function hashDeliveryCode(
  code: string,
  salt: string = randomBytes(SALT_BYTES).toString('hex'),
  iterations: number = DELIVERY_CODE_ITERATIONS,
): Promise<DeliveryCodeHash> {
  const key = await derive(
    code,
    Buffer.from(salt, 'hex'),
    iterations,
    KEY_BYTES,
    'sha256',
  );
  return { salt, iterations, hash: key.toString('hex') };
}

/** How a delivery code's hash is kept in `otps.otp_hash`. */
export const storeDeliveryCodeHash = ({
  salt,
  iterations,
  hash,
}: DeliveryCodeHash): string => `pbkdf2$${iterations}$${salt}$${hash}`;

export function parseDeliveryCodeHash(stored: string): DeliveryCodeHash | null {
  const [scheme, iterations, salt, hash] = stored.split('$');
  return scheme === 'pbkdf2' && iterations && salt && hash
    ? { salt, iterations: parseInt(iterations, 10), hash }
    : null;
}

export async function matchesDeliveryCode(
  code: string,
  stored: string,
): Promise<boolean> {
  const expected = parseDeliveryCodeHash(stored);
  if (!expected) {
    return false;
  }
  const actual = await hashDeliveryCode(
    code,
    expected.salt,
    expected.iterations,
  );
  return timingSafeEqual(
    Buffer.from(actual.hash, 'hex'),
    Buffer.from(expected.hash, 'hex'),
  );
}
