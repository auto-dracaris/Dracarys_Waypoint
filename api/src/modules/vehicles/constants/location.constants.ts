import type { LocationPointDto } from '../dto/location-batch.dto';

export const LOCATION_CLIENT = 'LOCATION_CLIENT';
export const LOCATION_STORE_PATTERN = 'vehicle.locations.store';

/**
 * A batch published to the location queue. It has already passed the DTO and
 * the "is this the vehicle's driver" check; `receivedAt` is when the request
 * arrived, as an ISO string.
 */
export interface LocationJob {
  vehicleId: number;
  driverId: number;
  receivedAt: string;
  points: LocationPointDto[];
}
