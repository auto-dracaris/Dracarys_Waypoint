/**
 * Checks which trip a position fix is filed under, including fixes that were
 * taken offline and reach the server after their trip has ended.
 *
 *   npx ts-node src/modules/vehicles/location-trip.check.ts
 */
import * as assert from 'assert';
import { tripIdAt } from '../../common/utils/vehicle.util';

const at = (time: string) => new Date(`2026-10-05T${time}:00+05:30`);

// Newest departure first, as `findTripsRunningBetween` returns them.
const trips = [
  { id: 'running', actualDepartAt: at('13:00'), completedAt: null },
  { id: 'finished', actualDepartAt: at('09:00'), completedAt: at('10:15') },
  // Dispatched the day before and never completed.
  { id: 'abandoned', actualDepartAt: at('01:00'), completedAt: null },
];

assert.strictEqual(tripIdAt(trips, at('09:30')), 'finished');
assert.strictEqual(tripIdAt(trips, at('10:15')), 'finished');
assert.strictEqual(tripIdAt(trips, at('14:00')), 'running');
// Between trips, the open-ended older trip is all that covers the fix.
assert.strictEqual(tripIdAt(trips, at('11:00')), 'abandoned');
assert.strictEqual(tripIdAt(trips, at('00:30')), null);
assert.strictEqual(tripIdAt(trips.slice(0, 2), at('11:00')), null);
assert.strictEqual(tripIdAt([], at('09:30')), null);

console.log('location-trip checks passed');
