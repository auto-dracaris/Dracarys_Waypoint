import { Brand } from '../../../common/enums/brand.enum';
import { DeferralReason } from '../../../common/enums/deferral-reason.enum';
import { DockType } from '../../../common/enums/dock-type.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

/**
 * The contract between the planning run and its two algorithms. Everything
 * here is plain data: the run gathers a `PlanningInput` from the database,
 * the algorithms decide, and the run validates and saves what they return.
 * See README.md in this folder.
 */

/** An order waiting to be planned on this run. */
export interface PlanningOrder {
  id: number;
  // The outlet's dataset id (OUT001), for messages.
  outlet: string;
  brand: Brand;
  district: string;
  tempRequirement: TempRequirement;
  units: number;
  weightKg: number;
  volumeM3: number;
  dockType: DockType;
  // Trucks cannot reach the outlet.
  vanOnly: boolean;
  // When the outlet takes deliveries, as HH:MM. A mall outlet's window is
  // already narrowed to the mall's access window.
  windowOpen: string;
  windowClose: string;
  // The day the store asked for; earlier than the run's date if it was deferred.
  requestedDate: string;
  timesDeferred: number;
  // Days since the outlet last received a delivery; null if it never has.
  daysSinceLastServed: number | null;
}

/** A vehicle of the depot that is available on the run's date. */
export interface PlanningVehicle {
  id: number;
  // The dataset id (VEH001), for messages.
  ref: string;
  type: VehicleType;
  isRefrigerated: boolean;
  weightCapKg: number;
  volumeCapM3: number;
  kmPerL: number;
  // What is left of the weekly fuel quota after trips already planned.
  fuelRemainingL: number;
}

/** Clear-road travel figures for one district (`district_travel.csv`). */
export interface DistrictTravel {
  outboundMin: number;
  outboundKm: number;
  interStopMin: number;
  interStopKm: number;
}

export interface PlanningInput {
  planDate: string;
  depot: string;
  orders: PlanningOrder[];
  vehicles: PlanningVehicle[];
  // The depot's districts, by name.
  districts: Record<string, DistrictTravel>;
  // Handling minutes per stop, keyed by `allowanceKey(brand, dockType)`.
  serviceAllowances: Record<string, number>;
  day: { isPayday: boolean; festivalRamp: number; monsoon: boolean };
  budgets: {
    // A vehicle's Fresh trips together, in minutes.
    freshMinutes: number;
    // Its Style and Tech trips together.
    otherMinutes: number;
    maxTripsPerVehicle: number;
  };
}

export const allowanceKey = (brand: Brand, dockType: DockType): string =>
  `${brand}:${dockType}`;

/** How urgent an order is, and why. Higher scores are planned first. */
export interface PriorityResult {
  orderId: number;
  score: number;
  // Whatever went into the score, kept so a decision can be explained later.
  factors: Record<string, number | string | boolean | null>;
}

/** One vehicle run. `orderIds` are in the order the vehicle visits them. */
export interface PlannedTrip {
  vehicleId: number;
  tripNo: 1 | 2;
  orderIds: number[];
}

export interface DeferredOrder {
  orderId: number;
  reason: DeferralReason;
  note?: string;
}

/**
 * The allocation decision, and nothing else: every order is either on exactly
 * one trip or deferred. Times, distances and fuel are worked out by the run.
 */
export interface AllocationResult {
  trips: PlannedTrip[];
  deferred: DeferredOrder[];
}

/** A broken rule. A plan with issues cannot be published. */
export interface Issue {
  rule: string;
  message: string;
  orderId?: number;
  vehicleId?: number;
  tripNo?: number;
}
