import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { PlanningInput, PriorityResult } from './planning.types';

/**
 * Scores every order awaiting planning; the allocator serves higher scores
 * first, so a low score is what gets deferred when capacity runs out.
 *
 * ponytail: placeholder until the real priority index lands. It only looks at
 * how often the order was already deferred, how long the outlet has gone
 * unserved, and whether the goods are chilled. Replace the body; keep the
 * signature and return one result per order in `input.orders`.
 */
export function calculatePriorities(input: PlanningInput): PriorityResult[] {
  return input.orders.map((order) => {
    const factors = {
      timesDeferred: order.timesDeferred,
      daysSinceLastServed: order.daysSinceLastServed,
      chilled: order.tempRequirement === TempRequirement.CHILLED,
    };
    return {
      orderId: order.id,
      score:
        factors.timesDeferred * 100 +
        (factors.daysSinceLastServed ?? 0) * 10 +
        (factors.chilled ? 5 : 0),
      factors,
    };
  });
}
