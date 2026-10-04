import { VehicleType } from '../enums/vehicle-type.enum';

/** What a driver calls the vehicle: "Refrigerated van", "Truck". */
export const vehicleLabel = (vehicle: {
  type: VehicleType;
  isRefrigerated: boolean;
}): string =>
  vehicle.isRefrigerated
    ? `Refrigerated ${vehicle.type}`
    : `${vehicle.type[0].toUpperCase()}${vehicle.type.slice(1)}`;

/**
 * The trip a position fix belongs to: the one on the road at the handset time
 * the fix was taken, not whichever is running when the fix reaches the server —
 * fixes taken offline often arrive after their trip has ended. `trips` must be
 * newest departure first, so a trip that was never completed does not claim
 * fixes from a later one.
 */
export const tripIdAt = (
  trips: {
    id: string;
    actualDepartAt: Date | null;
    completedAt: Date | null;
  }[],
  recordedAt: Date,
): string | null =>
  trips.find(
    (trip) =>
      trip.actualDepartAt !== null &&
      trip.actualDepartAt <= recordedAt &&
      (trip.completedAt === null || recordedAt <= trip.completedAt),
  )?.id ?? null;
