import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * What every driver action carries: an id minted on the handset, so the same
 * action sent twice (a retry after working offline) is recognisable.
 */
export class DriverActionDto {
  @IsUUID(undefined, { message: 'clientId must be a UUID' })
  clientId: string;
}

export class StartTripDto extends DriverActionDto {
  // The handset's clock, not the time the server heard about it.
  @IsDateString({}, { message: 'startedAt must be an ISO timestamp' })
  startedAt: string;
}

/** An action at a stop names the route version the driver was looking at. */
class StopActionDto extends DriverActionDto {
  @Type(() => Number)
  @IsInt({ message: 'planVersion must be an integer' })
  @Min(1, { message: 'planVersion must be at least 1' })
  planVersion: number;
}

export class ArriveStopDto extends StopActionDto {
  @IsDateString({}, { message: 'arrivedAt must be an ISO timestamp' })
  arrivedAt: string;

  // Where the handset was when it recorded the arrival.
  @IsOptional()
  @IsLatitude({ message: 'lat must be a latitude' })
  lat?: number;

  @IsOptional()
  @IsLongitude({ message: 'lng must be a longitude' })
  lng?: number;
}

export class CompleteStopDto extends StopActionDto {
  @IsDateString({}, { message: 'completedAt must be an ISO timestamp' })
  completedAt: string;

  // Cases handed over per order, keyed by order reference: { "ORD0000012": 12 }.
  @IsObject({ message: 'deliveredCases must map each order to a number' })
  deliveredCases: Record<string, number>;
}
