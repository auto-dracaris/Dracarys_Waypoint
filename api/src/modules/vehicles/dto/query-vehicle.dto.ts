import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Depot } from '../../../common/enums/depot.enum';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

export const VEHICLE_SORT_KEYS = [
  'uniqueId',
  'type',
  'weightCapKg',
  'status',
] as const;
export type VehicleSortKey = (typeof VEHICLE_SORT_KEYS)[number];

export class QueryVehicleDto extends PaginationQueryDto {
  // The dataset identifier, e.g. VEH001.
  @IsOptional()
  @IsString()
  uniqueId?: string;

  // Matches the vehicle id or registration number, case-insensitively.
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;

  @IsOptional()
  @IsEnum(VehicleStatus, {
    message: `status must be one of: ${Object.values(VehicleStatus).join(', ')}`,
  })
  status?: VehicleStatus;

  @IsOptional()
  @IsEnum(VEHICLE_SORT_KEYS, {
    message: `sortBy must be one of: ${VEHICLE_SORT_KEYS.join(', ')}`,
  })
  sortBy?: VehicleSortKey;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortDir must be asc or desc' })
  sortDir?: 'asc' | 'desc';

  @IsOptional()
  @IsEnum(Depot)
  depot?: Depot;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  // Query strings arrive as text, so map the two literals and let anything
  // else fall through to `@IsBoolean` to be rejected.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'isRefrigerated must be true or false' })
  isRefrigerated?: boolean;

  // The delivery day `plannedTrips` is counted for. Defaults to today.
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
