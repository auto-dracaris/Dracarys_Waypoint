import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LocationPointDto {
  // Minted on the handset, so a point sent twice is stored once.
  @IsUUID(undefined, { message: 'clientId must be a UUID' })
  clientId: string;

  @IsLatitude({ message: 'lat must be a latitude' })
  lat: number;

  @IsLongitude({ message: 'lng must be a longitude' })
  lng: number;

  // Degrees clockwise from north.
  @IsOptional()
  @IsInt({ message: 'heading must be a whole number of degrees' })
  @Min(0, { message: 'heading must be at least 0' })
  @Max(360, { message: 'heading must be at most 360' })
  heading?: number;

  @IsOptional()
  @IsNumber({}, { message: 'speedKmh must be a number' })
  @Min(0, { message: 'speedKmh cannot be negative' })
  speedKmh?: number;

  // The handset's clock when the fix was taken.
  @IsDateString({}, { message: 'recordedAt must be an ISO timestamp' })
  recordedAt: string;
}

export class LocationBatchDto {
  @ArrayNotEmpty({ message: 'points must hold at least one fix' })
  // Enough for an offline spell to drain in a few calls while a full batch
  // stays under Express's 100 KB JSON limit.
  @ArrayMaxSize(500, { message: 'points must hold at most 500 fixes' })
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points: LocationPointDto[];
}
