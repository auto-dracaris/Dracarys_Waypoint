import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Depot } from '../../../common/enums/depot.enum';
import { FuelType } from '../../../common/enums/fuel-type.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

const twoDecimals = { maxDecimalPlaces: 2 };

export class CreateVehicleDto {
  // The dataset identifier, e.g. VEH031.
  @IsNotEmpty({ message: 'Vehicle ID is required' })
  @IsString({ message: 'Vehicle ID must be a string' })
  @MaxLength(20, { message: 'Vehicle ID must be at most 20 characters' })
  uniqueId: string;

  @IsOptional()
  @IsString({ message: 'Registration number must be a string' })
  @MaxLength(20, {
    message: 'Registration number must be at most 20 characters',
  })
  registrationNo?: string;

  @IsEnum(VehicleType, {
    message: `Type must be one of: ${Object.values(VehicleType).join(', ')}`,
  })
  type: VehicleType;

  @IsEnum(Depot, {
    message: `Depot must be one of: ${Object.values(Depot).join(', ')}`,
  })
  depot: Depot;

  @IsOptional()
  @IsBoolean({ message: 'isRefrigerated must be true or false' })
  isRefrigerated?: boolean;

  @IsOptional()
  @IsEnum(FuelType, {
    message: `Fuel type must be one of: ${Object.values(FuelType).join(', ')}`,
  })
  fuelType?: FuelType;

  @IsNumber(twoDecimals, {
    message: 'Weight capacity must be a number with at most 2 decimals',
  })
  @IsPositive({ message: 'Weight capacity must be positive' })
  weightCapKg: number;

  @IsNumber(twoDecimals, {
    message: 'Volume capacity must be a number with at most 2 decimals',
  })
  @IsPositive({ message: 'Volume capacity must be positive' })
  volumeCapM3: number;

  @IsNumber(twoDecimals, {
    message: 'Fuel efficiency must be a number with at most 2 decimals',
  })
  @IsPositive({ message: 'Fuel efficiency must be positive' })
  kmPerL: number;

  @IsNumber(twoDecimals, {
    message: 'Weekly fuel quota must be a number with at most 2 decimals',
  })
  @IsPositive({ message: 'Weekly fuel quota must be positive' })
  weeklyFuelQuotaL: number;
}
