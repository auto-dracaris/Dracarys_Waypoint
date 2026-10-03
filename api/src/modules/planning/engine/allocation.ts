import { Brand } from '../../../common/enums/brand.enum';
import { DeferralReason } from '../../../common/enums/deferral-reason.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import { checkVehicle, toMinutes } from './feasibility';
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
 * Implements the multi-level hierarchical bin packing and constraint-based
 * allocation ported from the Waypoint dispatch planning algorithm:
 * 1. Groups orders by (brand, district).
 * 2. Prioritizes Fresh brand (morning window 03:30-08:00) and previously deferred orders.
 * 3. Partitions into 4 constraint buckets (van|reefer, van|any, any|reefer, any|any).
 * 4. Selects vehicles to preserve scarce assets (vans and reefers).
 * 5. Uses Earliest Deadline First (EDF) stop ordering and verifies feasibility via checkVehicle.
 */
export function allocate(
  input: PlanningInput,
  priorities: PriorityResult[],
): AllocationResult {
  const score = new Map(priorities.map((p) => [p.orderId, p.score]));
  const byId = new Map(input.orders.map((order) => [order.id, order]));
  const trips = new Map<number, PlannedTrip[]>();
  const result: AllocationResult = { trips: [], deferred: [] };

  const maxFleetWeight = Math.max(
    ...input.vehicles.map((v) => v.weightCapKg),
    0,
  );
  const maxFleetVol = Math.max(...input.vehicles.map((v) => v.volumeCapM3), 0);

  // Filter out orders that physically exceed the capacity of every single vehicle in the fleet
  const plannableOrders: PlanningOrder[] = [];
  for (const order of input.orders) {
    if (order.weightKg > maxFleetWeight || order.volumeM3 > maxFleetVol) {
      result.deferred.push({
        orderId: order.id,
        reason: DeferralReason.VEHICLE_CAPACITY,
        note: `Order load (${order.weightKg.toFixed(1)} kg / ${order.volumeM3.toFixed(2)} m³) exceeds maximum single vehicle capacity in fleet`,
      });
    } else {
      plannableOrders.push(order);
    }
  }

  // Helper to test placing an order on a vehicle's trip
  const withOrder = (
    vehicle: PlanningVehicle,
    tripNo: 1 | 2,
    order: PlanningOrder,
  ): PlannedTrip[] | null => {
    const current = trips.get(vehicle.id) ?? [];
    const existing = current.find((trip) => trip.tripNo === tripNo);
    const orderList = [...(existing?.orderIds ?? []), order.id];

    // Try earlier opening first (allows earlier departure from depot), then earlier deadline first
    const candidateSorts = [
      [...orderList].sort(
        (a, b) =>
          toMinutes(byId.get(a)!.windowOpen) -
            toMinutes(byId.get(b)!.windowOpen) ||
          toMinutes(byId.get(a)!.windowClose) -
            toMinutes(byId.get(b)!.windowClose),
      ),
      [...orderList].sort(
        (a, b) =>
          toMinutes(byId.get(a)!.windowClose) -
            toMinutes(byId.get(b)!.windowClose) ||
          toMinutes(byId.get(a)!.windowOpen) -
            toMinutes(byId.get(b)!.windowOpen),
      ),
    ];

    for (const orderIds of candidateSorts) {
      const next = [
        ...current.filter((trip) => trip.tripNo !== tripNo),
        { vehicleId: vehicle.id, tripNo, orderIds },
      ];
      if (checkVehicle(input, vehicle, next).length === 0) {
        return next;
      }
    }
    return null;
  };

  // Group plannable orders by (brand, district)
  const groupKey = (o: PlanningOrder) => `${o.brand}|${o.district}`;
  const orderGroups = new Map<string, PlanningOrder[]>();
  for (const o of plannableOrders) {
    const key = groupKey(o);
    if (!orderGroups.has(key)) orderGroups.set(key, []);
    orderGroups.get(key)!.push(o);
  }

  // Sort groups:
  // Fresh first:
  //   For Fresh: prioritize groups with chilled orders, then farther districts (need Trip 1 due to long travel),
  //   then previously deferred orders.
  const groupEntries = [...orderGroups.entries()].sort((a, b) => {
    const [keyA, ordersA] = a;
    const [keyB, ordersB] = b;
    const [brandA, distA] = keyA.split('|') as [Brand, string];
    const [brandB, distB] = keyB.split('|') as [Brand, string];

    if (brandA === Brand.FRESH && brandB !== Brand.FRESH) return -1;
    if (brandA !== Brand.FRESH && brandB === Brand.FRESH) return 1;

    if (brandA === Brand.FRESH) {
      // Districts with chilled orders need reefer trucks on Trip 1
      const chilledA = ordersA.some(
        (o) => o.tempRequirement === TempRequirement.CHILLED,
      )
        ? 1
        : 0;
      const chilledB = ordersB.some(
        (o) => o.tempRequirement === TempRequirement.CHILLED,
      )
        ? 1
        : 0;
      if (chilledB !== chilledA) return chilledB - chilledA;

      // Farther districts must be on Trip 1 because they cannot make morning window on Trip 2
      const distMinA = input.districts[distA]?.outboundMin ?? 0;
      const distMinB = input.districts[distB]?.outboundMin ?? 0;
      if (distMinB !== distMinA) return distMinB - distMinA;
    }

    const hasDeferredA = ordersA.some((o) => o.timesDeferred > 0) ? 1 : 0;
    const hasDeferredB = ordersB.some((o) => o.timesDeferred > 0) ? 1 : 0;
    if (hasDeferredB !== hasDeferredA) return hasDeferredB - hasDeferredA;

    const scoreA = ordersA.reduce((sum, o) => sum + (score.get(o.id) ?? 0), 0);
    const scoreB = ordersB.reduce((sum, o) => sum + (score.get(o.id) ?? 0), 0);
    return scoreB - scoreA;
  });

  const unplacedOrders: PlanningOrder[] = [];

  // Step 3: Iterate through groups and sub-split by vehicle constraints
  for (const [, groupOrders] of groupEntries) {
    const buckets: Record<string, PlanningOrder[]> = {
      'van|reefer': [],
      'van|any': [],
      'any|reefer': [],
      'any|any': [],
    };

    for (const o of groupOrders) {
      const isVanOnly = o.vanOnly;
      const isChilled = o.tempRequirement === TempRequirement.CHILLED;
      const bKey = `${isVanOnly ? 'van' : 'any'}|${isChilled ? 'reefer' : 'any'}`;
      buckets[bKey].push(o);
    }

    const bucketKeys = [
      'van|reefer',
      'van|any',
      'any|reefer',
      'any|any',
    ] as const;

    for (const bKey of bucketKeys) {
      const bucketOrders = buckets[bKey];
      if (!bucketOrders.length) continue;

      const needsVan = bKey.startsWith('van');
      const needsReefer = bKey.endsWith('reefer');

      // Sort bucket orders: priority score desc, earliest window close, weight desc
      bucketOrders.sort((a, b) => {
        const sDiff = (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0);
        if (sDiff !== 0) return sDiff;
        const wDiff = toMinutes(a.windowClose) - toMinutes(b.windowClose);
        if (wDiff !== 0) return wDiff;
        return b.weightKg - a.weightKg;
      });

      // Filter and sort candidate vehicles
      const candidateVehicles = [...input.vehicles]
        .filter((v) => {
          if (needsReefer && !v.isRefrigerated) return false;
          if (needsVan && v.type !== VehicleType.VAN) return false;
          return true;
        })
        .sort((a, b) => {
          // If the order does not need a van, TRUCKS must come first to preserve scarce vans!
          if (!needsVan) {
            const isTruckA = a.type === VehicleType.TRUCK ? 1 : 0;
            const isTruckB = b.type === VehicleType.TRUCK ? 1 : 0;
            if (isTruckB !== isTruckA) return isTruckB - isTruckA;
          }

          // If the order does not need refrigeration, ambient vehicles must come first to preserve reefers!
          if (!needsReefer) {
            const isAmbientA = !a.isRefrigerated ? 1 : 0;
            const isAmbientB = !b.isRefrigerated ? 1 : 0;
            if (isAmbientB !== isAmbientA) return isAmbientB - isAmbientA;
          }

          return a.weightCapKg - b.weightCapKg || a.id - b.id;
        });

      for (const order of bucketOrders) {
        let placed: { vehicle: PlanningVehicle; next: PlannedTrip[] } | null =
          null;

        // Try joining existing trip for this brand and district first, then open a new trip
        for (const joinExisting of [true, false]) {
          for (const vehicle of candidateVehicles) {
            for (const tripNo of [1, 2] as const) {
              const existing = (trips.get(vehicle.id) ?? []).find(
                (trip) => trip.tripNo === tripNo,
              );
              if (joinExisting !== !!existing) {
                continue;
              }
              // A new trip takes the vehicle's lowest free number
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
          unplacedOrders.push(order);
        }
      }
    }
  }

  // Second pass: try any compatible vehicle in the fleet for unplaced orders
  for (const order of unplacedOrders) {
    let placed: { vehicle: PlanningVehicle; next: PlannedTrip[] } | null = null;
    const compatibleVehicles = [...input.vehicles]
      .filter((v) => {
        if (
          order.tempRequirement === TempRequirement.CHILLED &&
          !v.isRefrigerated
        )
          return false;
        if (order.vanOnly && v.type !== VehicleType.VAN) return false;
        return true;
      })
      .sort((a, b) => a.id - b.id);

    for (const joinExisting of [true, false]) {
      for (const vehicle of compatibleVehicles) {
        for (const tripNo of [1, 2] as const) {
          const existing = (trips.get(vehicle.id) ?? []).find(
            (trip) => trip.tripNo === tripNo,
          );
          if (joinExisting !== !!existing) continue;
          if (
            !existing &&
            tripNo === 2 &&
            !(trips.get(vehicle.id) ?? []).length
          )
            continue;

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
        note: 'No vehicle could take it within capacity, time budget and delivery window constraints',
      });
    }
  }

  result.trips = [...trips.values()].flat();
  return result;
}
