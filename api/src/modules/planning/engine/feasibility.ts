import { Brand } from '../../../common/enums/brand.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { toMinutes } from '../../../common/utils/date.util';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import {
  AllocationResult,
  Issue,
  PlannedTrip,
  PlanningInput,
  PlanningOrder,
  PlanningVehicle,
  allowanceKey,
} from './planning.types';

/**
 * The booklet's operating rules, as code. Shared by the planning run (which
 * never trusts an allocation it has not checked) and by any allocator that
 * wants to test a move before making it.
 */

// When each kind of trip may start: Fresh runs before stores open, Style and
// Tech during the trading day. Minutes from midnight.
const FRESH_START_MIN = 3 * 60 + 30;
const OTHER_START_MIN = 8 * 60;

export interface StopSchedule {
  orderId: number;
  // Minutes from midnight on the run's date.
  arrivalMin: number;
  // An early vehicle waits for the outlet's window to open.
  waitMin: number;
  serviceMin: number;
}

export interface TripSchedule {
  vehicleId: number;
  tripNo: 1 | 2;
  brand: Brand;
  district: string;
  departMin: number;
  // The booklet's trip time: outbound + between stops + handling. It leaves
  // out waiting and the return leg, which the daily budgets already allow for.
  minutes: number;
  km: number;
  fuelL: number;
  weightKg: number;
  volumeM3: number;
  stops: StopSchedule[];
}

/**
 * Times, distance, fuel and load for one vehicle's trips, in trip order. A
 * trip that names an unknown order or district is skipped; `validate` reports it.
 */
export function scheduleVehicle(
  input: PlanningInput,
  vehicle: PlanningVehicle,
  trips: PlannedTrip[],
): TripSchedule[] {
  const orders = new Map(input.orders.map((order) => [order.id, order]));
  // Fresh and the trading-day brands run in separate windows, each with its own clock.
  const clock = { fresh: FRESH_START_MIN, other: OTHER_START_MIN };
  const schedules: TripSchedule[] = [];

  for (const trip of [...trips].sort((a, b) => a.tripNo - b.tripNo)) {
    const stops = trip.orderIds.map((id) => orders.get(id));
    const first = stops[0];
    const travel = first && input.districts[first.district];
    if (!first || !travel || stops.some((stop) => !stop)) {
      continue;
    }
    const tripOrders = stops as PlanningOrder[];
    const bucket = first.brand === Brand.FRESH ? 'fresh' : 'other';

    // Leave no earlier than the vehicle is free, and no earlier than needed to
    // reach the first outlet as its window opens.
    const departMin = Math.max(
      clock[bucket],
      toMinutes(first.windowOpen) - travel.outboundMin,
    );
    let now = departMin + travel.outboundMin;
    let handling = 0;
    const stopSchedules = tripOrders.map((order, i) => {
      if (i > 0) {
        now += travel.interStopMin;
      }
      const arrivalMin = now;
      const waitMin = Math.max(0, toMinutes(order.windowOpen) - arrivalMin);
      const serviceMin =
        input.serviceAllowances[allowanceKey(order.brand, order.dockType)] ?? 0;
      handling += serviceMin;
      now = arrivalMin + waitMin + serviceMin;
      return { orderId: order.id, arrivalMin, waitMin, serviceMin };
    });
    // The vehicle drives back before it can start its next trip.
    clock[bucket] = now + travel.outboundMin;

    const km =
      travel.outboundKm * 2 + travel.interStopKm * (tripOrders.length - 1);
    schedules.push({
      vehicleId: vehicle.id,
      tripNo: trip.tripNo,
      brand: first.brand,
      district: first.district,
      departMin,
      minutes:
        travel.outboundMin +
        travel.interStopMin * (tripOrders.length - 1) +
        handling,
      km,
      fuelL: km / vehicle.kmPerL,
      weightKg: tripOrders.reduce((sum, order) => sum + order.weightKg, 0),
      volumeM3: tripOrders.reduce((sum, order) => sum + order.volumeM3, 0),
      stops: stopSchedules,
    });
  }
  return schedules;
}

/** Every rule one vehicle's trips break; empty when they are all feasible. */
export function checkVehicle(
  input: PlanningInput,
  vehicle: PlanningVehicle,
  trips: PlannedTrip[],
): Issue[] {
  const orders = new Map(input.orders.map((order) => [order.id, order]));
  const issues: Issue[] = [];
  const at = { vehicleId: vehicle.id };

  if (trips.length > input.budgets.maxTripsPerVehicle) {
    issues.push({
      rule: 'max_trips',
      message: `${vehicle.ref} has ${trips.length} trips; the limit is ${input.budgets.maxTripsPerVehicle} a day`,
      ...at,
    });
  }
  if (new Set(trips.map((trip) => trip.tripNo)).size !== trips.length) {
    issues.push({
      rule: 'trip_no',
      message: `${vehicle.ref} has two trips with the same trip number`,
      ...at,
    });
  }

  for (const trip of trips) {
    const here = { ...at, tripNo: trip.tripNo };
    const tripOrders = trip.orderIds.flatMap((id) => orders.get(id) ?? []);
    if (!trip.orderIds.length || tripOrders.length !== trip.orderIds.length) {
      issues.push({
        rule: 'unknown_order',
        message: `${vehicle.ref} trip ${trip.tripNo} is empty or names an order that is not awaiting planning`,
        ...here,
      });
      continue;
    }
    const [first] = tripOrders;
    if (!input.districts[first.district]) {
      issues.push({
        rule: 'home_depot',
        message: `${first.district} is not served from ${input.depot}`,
        ...here,
      });
    }
    for (const order of tripOrders) {
      const on = { ...here, orderId: order.id };
      if (order.brand !== first.brand || order.district !== first.district) {
        issues.push({
          rule: 'brand_district',
          message: `${vehicle.ref} trip ${trip.tripNo} mixes brands or districts`,
          ...on,
        });
      }
      if (
        order.tempRequirement === TempRequirement.CHILLED &&
        !vehicle.isRefrigerated
      ) {
        issues.push({
          rule: 'refrigeration',
          message: `Chilled order for ${order.outlet} is on ${vehicle.ref}, which is not refrigerated`,
          ...on,
        });
      }
      if (order.vanOnly && vehicle.type !== VehicleType.VAN) {
        issues.push({
          rule: 'vehicle_access',
          message: `${order.outlet} can only be reached by van; ${vehicle.ref} is a ${vehicle.type}`,
          ...on,
        });
      }
    }
  }

  const schedules = scheduleVehicle(input, vehicle, trips);
  const minutes = { fresh: 0, other: 0 };
  let fuel = 0;
  for (const schedule of schedules) {
    const here = { ...at, tripNo: schedule.tripNo };
    minutes[schedule.brand === Brand.FRESH ? 'fresh' : 'other'] +=
      schedule.minutes;
    fuel += schedule.fuelL;
    // A hair of tolerance, since loads are sums of decimals.
    if (
      schedule.weightKg > vehicle.weightCapKg + 1e-6 ||
      schedule.volumeM3 > vehicle.volumeCapM3 + 1e-6
    ) {
      issues.push({
        rule: 'capacity',
        message: `${vehicle.ref} trip ${schedule.tripNo} carries ${schedule.weightKg.toFixed(1)} kg / ${schedule.volumeM3.toFixed(2)} m³; it holds ${vehicle.weightCapKg} kg / ${vehicle.volumeCapM3} m³`,
        ...here,
      });
    }
    for (const stop of schedule.stops) {
      const order = orders.get(stop.orderId)!;
      if (stop.arrivalMin + stop.waitMin > toMinutes(order.windowClose)) {
        issues.push({
          rule: 'delivery_window',
          message: `${vehicle.ref} reaches ${order.outlet} after its window closes at ${order.windowClose}`,
          ...here,
          orderId: order.id,
        });
      }
    }
  }
  if (minutes.fresh > input.budgets.freshMinutes) {
    issues.push({
      rule: 'time_budget',
      message: `${vehicle.ref} needs ${minutes.fresh} min for Fresh trips; the budget is ${input.budgets.freshMinutes}`,
      ...at,
    });
  }
  if (minutes.other > input.budgets.otherMinutes) {
    issues.push({
      rule: 'time_budget',
      message: `${vehicle.ref} needs ${minutes.other} min for Style and Tech trips; the budget is ${input.budgets.otherMinutes}`,
      ...at,
    });
  }
  if (fuel > vehicle.fuelRemainingL + 1e-6) {
    issues.push({
      rule: 'fuel_quota',
      message: `${vehicle.ref} needs ${fuel.toFixed(1)} L; ${vehicle.fuelRemainingL.toFixed(1)} L of its weekly quota is left`,
      ...at,
    });
  }
  return issues;
}

/** Trips grouped by the vehicle that runs them. */
export function tripsByVehicle(
  trips: PlannedTrip[],
): Map<number, PlannedTrip[]> {
  const grouped = new Map<number, PlannedTrip[]>();
  for (const trip of trips) {
    grouped.set(trip.vehicleId, [...(grouped.get(trip.vehicleId) ?? []), trip]);
  }
  return grouped;
}

/** Every rule an allocation breaks; empty when it can be published. */
export function validate(
  input: PlanningInput,
  result: AllocationResult,
): Issue[] {
  const issues: Issue[] = [];
  const vehicles = new Map(input.vehicles.map((v) => [v.id, v]));

  // Whole orders: each one is decided exactly once.
  const decisions = new Map<number, number>();
  for (const id of [
    ...result.trips.flatMap((trip) => trip.orderIds),
    ...result.deferred.map((deferred) => deferred.orderId),
  ]) {
    decisions.set(id, (decisions.get(id) ?? 0) + 1);
  }
  for (const order of input.orders) {
    const count = decisions.get(order.id) ?? 0;
    if (count !== 1) {
      issues.push({
        rule: 'whole_orders',
        message:
          count === 0
            ? `The order for ${order.outlet} is neither on a trip nor deferred`
            : `The order for ${order.outlet} is decided ${count} times`,
        orderId: order.id,
      });
    }
  }

  for (const [vehicleId, trips] of tripsByVehicle(result.trips)) {
    const vehicle = vehicles.get(vehicleId);
    if (!vehicle) {
      issues.push({
        rule: 'vehicle',
        message: `Vehicle ${vehicleId} is not available at ${input.depot} on ${input.planDate}`,
        vehicleId,
      });
      continue;
    }
    issues.push(...checkVehicle(input, vehicle, trips));
  }
  return issues;
}
