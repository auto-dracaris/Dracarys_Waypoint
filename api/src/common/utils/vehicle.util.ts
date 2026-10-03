import { VehicleType } from '../enums/vehicle-type.enum';

/** What a driver calls the vehicle: "Refrigerated van", "Truck". */
export const vehicleLabel = (vehicle: {
  type: VehicleType;
  isRefrigerated: boolean;
}): string =>
  vehicle.isRefrigerated
    ? `Refrigerated ${vehicle.type}`
    : `${vehicle.type[0].toUpperCase()}${vehicle.type.slice(1)}`;
