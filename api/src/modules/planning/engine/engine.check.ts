/**
 * Runs the two algorithms on the booklet's peak-day scenario (Task 2B) and
 * fails if the allocation breaks a rule or leaves an order undecided.
 *
 *   npx ts-node src/modules/planning/engine/engine.check.ts
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { Brand } from '../../../common/enums/brand.enum';
import { DockType } from '../../../common/enums/dock-type.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import { allocate } from './allocation';
import { validate } from './feasibility';
import { PlanningInput, allowanceKey } from './planning.types';
import { calculatePriorities } from './priority';

const DATA = path.resolve(__dirname, '../../../../data');

function csv(file: string): Record<string, string>[] {
  const [header, ...rows] = fs
    .readFileSync(path.join(DATA, file), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const keys = header.split(',');
  return rows.map((row) => {
    const cols = row.split(',');
    return Object.fromEntries(keys.map((key, i) => [key, cols[i] ?? '']));
  });
}

const DEPOT = 'Peliyagoda';
const available = new Set(
  csv('Test Data/task2b_peak_day_fleet.csv')
    .filter((row) => row.status === 'available')
    .map((row) => row.vehicle_id),
);

const input: PlanningInput = {
  planDate: '2026-04-06',
  depot: DEPOT,
  orders: csv('Test Data/task2b_peak_day_scenarios.csv').map((row, i) => ({
    id: i + 1,
    outlet: row.outlet_id,
    brand: row.brand as Brand,
    district: row.district,
    tempRequirement: row.temp_requirement as TempRequirement,
    units: Number(row.order_units),
    weightKg: Number(row.order_weight_kg),
    volumeM3: Number(row.order_volume_m3),
    dockType: row.dock_type as DockType,
    vanOnly: row.parking_constraint === 'van_only',
    windowOpen: row.window_open_time,
    windowClose: row.window_close_time,
    requestedDate: '2026-04-06',
    timesDeferred: Number(row.deferred_yesterday),
    daysSinceLastServed: Number(row.days_since_last_served),
  })),
  vehicles: csv('General Data/vehicles.csv')
    .filter((row) => row.depot === DEPOT && available.has(row.vehicle_id))
    .map((row, i) => ({
      id: i + 1,
      ref: row.vehicle_id,
      type: row.type as VehicleType,
      isRefrigerated: row.temp === 'reefer',
      weightCapKg: Number(row.weight_cap_kg),
      volumeCapM3: Number(row.volume_cap_m3),
      kmPerL: Number(row.km_per_l),
      fuelRemainingL: Number(row.weekly_fuel_quota_l),
    })),
  districts: Object.fromEntries(
    csv('General Data/district_travel.csv')
      .filter((row) => row.depot === DEPOT)
      .map((row) => [
        row.district,
        {
          outboundMin: Number(row.depot_to_district_freeflow_min),
          outboundKm: Number(row.depot_to_district_km),
          interStopMin: Number(row.inter_stop_freeflow_min),
          interStopKm: Number(row.inter_stop_km),
        },
      ]),
  ),
  serviceAllowances: Object.fromEntries(
    csv('General Data/service_allowance.csv').map((row) => [
      allowanceKey(row.brand as Brand, row.dock_type as DockType),
      Number(row.service_allowance_min),
    ]),
  ),
  day: { isPayday: false, festivalRamp: 0.3, monsoon: false },
  budgets: { freshMinutes: 270, otherMinutes: 480, maxTripsPerVehicle: 2 },
};

const priorities = calculatePriorities(input);
assert.strictEqual(
  priorities.length,
  input.orders.length,
  'one score per order',
);

const result = allocate(input, priorities);
const issues = validate(input, result);
assert.deepStrictEqual(issues, [], 'the allocation breaks a rule');

const served = result.trips.reduce(
  (sum, trip) => sum + trip.orderIds.length,
  0,
);
assert.strictEqual(
  served + result.deferred.length,
  input.orders.length,
  'every order is decided',
);

console.log(
  `ok: ${input.orders.length} orders, ${input.vehicles.length} vehicles -> ` +
    `${served} served on ${result.trips.length} trips, ${result.deferred.length} deferred`,
);
