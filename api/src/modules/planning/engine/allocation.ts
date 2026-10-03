import { DeferralReason } from '../../../common/enums/deferral-reason.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import { toMinutes } from '../../../common/utils/date.util';
import { checkVehicle } from './feasibility';
import {
  AllocationResult,
  PlannedTrip,
  PlanningInput,
  PlanningOrder,
  PlanningVehicle,
  PriorityResult,
} from './planning.types';

/**
 * Decides, for every order, which vehicle and trip carries it or why it is
 * deferred. The result must pass `validate` in feasibility.ts.
 *
 * ponytail: placeholder until the real allocator lands. First-fit in priority
 * order: an order joins the first trip it fits on, else opens a trip on the
 * first vehicle with a free slot, else is deferred. It never moves an order
 * once placed, so it leaves capacity unused that a smarter search would find.
 * Replace the body; keep the signature.
 */
export function allocate(
  input: PlanningInput,
  priorities: PriorityResult[],
): AllocationResult {
  const score = new Map(priorities.map((p) => [p.orderId, p.score]));
  const orders = [...input.orders].sort(
    (a, b) =>
      (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) ||
      toMinutes(a.windowClose) - toMinutes(b.windowClose) ||
      a.id - b.id,
  );
  const byId = new Map(input.orders.map((order) => [order.id, order]));
  const trips = new Map<number, PlannedTrip[]>();
  const result: AllocationResult = { trips: [], deferred: [] };

  // The vehicle's trips with `order` added to trip `tripNo`, earliest-closing
  // window first; null if that breaks a rule.
  const withOrder = (
    vehicle: PlanningVehicle,
    tripNo: 1 | 2,
    order: PlanningOrder,
  ): PlannedTrip[] | null => {
    const current = trips.get(vehicle.id) ?? [];
    const existing = current.find((trip) => trip.tripNo === tripNo);
    const orderIds = [...(existing?.orderIds ?? []), order.id].sort(
      (a, b) =>
        toMinutes(byId.get(a)!.windowClose) -
        toMinutes(byId.get(b)!.windowClose),
    );
    const next = [
      ...current.filter((trip) => trip.tripNo !== tripNo),
      { vehicleId: vehicle.id, tripNo, orderIds },
    ];
    return checkVehicle(input, vehicle, next).length ? null : next;
  };

  for (const order of orders) {
    // Keep scarce vehicles for the orders that need them: vans for van-only
    // outlets, refrigerated vehicles for chilled goods.
    const vehicles = [...input.vehicles].sort(
      (a, b) =>
        Number(a.type === VehicleType.VAN) -
          Number(b.type === VehicleType.VAN) ||
        Number(a.isRefrigerated) - Number(b.isRefrigerated) ||
        a.id - b.id,
    );
    let placed: { vehicle: PlanningVehicle; next: PlannedTrip[] } | null = null;

    // First a trip already going to this brand and district, then a new one.
    for (const joinExisting of [true, false]) {
      for (const vehicle of vehicles) {
        for (const tripNo of [1, 2] as const) {
          const existing = (trips.get(vehicle.id) ?? []).find(
            (trip) => trip.tripNo === tripNo,
          );
          if (joinExisting !== !!existing) {
            continue;
          }
          // A new trip takes the vehicle's lowest free number.
          if (
            !existing &&
            tripNo === 2 &&
            !(trips.get(vehicle.id) ?? []).length
          ) {
            continue;
          }
          const next = withOrder(vehicle, tripNo, order);
          if (next) {
            placed = { vehicle, next };
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }

    if (placed) {
      trips.set(placed.vehicle.id, placed.next);
    } else {
      result.deferred.push({
        orderId: order.id,
        reason: order.vanOnly
          ? DeferralReason.VAN_ACCESS
          : order.tempRequirement === TempRequirement.CHILLED
            ? DeferralReason.REFRIGERATED_CAPACITY
            : DeferralReason.VEHICLE_CAPACITY,
        note: 'No vehicle could take it within the capacity, time and fuel limits',
      });
    }
  }

  result.trips = [...trips.values()].flat();
  return result;
}
