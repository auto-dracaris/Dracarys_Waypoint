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
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

export class QueryVehicleDto extends PaginationQueryDto {
  // The dataset identifier, e.g. VEH001.
  @IsOptional()
  @IsString()
  uniqueId?: string;

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
