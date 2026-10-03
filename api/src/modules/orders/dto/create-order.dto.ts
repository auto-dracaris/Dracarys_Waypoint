import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';

/** The outlet is not sent: an order is always for the caller's own outlet. */
export class CreateOrderDto {
  // The delivery day being asked for.
  @IsDateString(
    { strict: true },
    { message: 'Requested date must be a valid date' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Requested date must be YYYY-MM-DD',
  })
  requestedDate: string;

  @IsEnum(TempRequirement, {
    message: `Temperature requirement must be one of: ${Object.values(TempRequirement).join(', ')}`,
  })
  tempRequirement: TempRequirement;

  @IsInt({ message: 'Quantity must be a whole number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  orderUnits: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Weight must be a number with at most 2 decimals' },
  )
  @IsPositive({ message: 'Weight must be positive' })
  orderWeightKg: number;

  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Volume must be a number with at most 3 decimals' },
  )
  @IsPositive({ message: 'Volume must be positive' })
  orderVolumeM3: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must be at most 500 characters' })
  notes?: string;
}
