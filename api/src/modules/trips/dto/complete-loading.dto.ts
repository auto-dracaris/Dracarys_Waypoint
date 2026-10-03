import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class LoadingShortfallDto {
  // The order reference, e.g. ORD0000012.
  @IsNotEmpty({ message: 'orderId is required' })
  @IsString({ message: 'orderId must be an order reference' })
  orderId: string;

  @IsInt({ message: 'shortCases must be a whole number' })
  @Min(1, { message: 'shortCases must be at least 1' })
  shortCases: number;

  @IsOptional()
  @IsString({ message: 'dispatcherNote must be a string' })
  @MaxLength(300, { message: 'dispatcherNote must be at most 300 characters' })
  dispatcherNote?: string;
}

export class CompleteLoadingDto {
  // Set when an order went on the vehicle short of what was planned.
  @IsOptional()
  @ValidateNested()
  @Type(() => LoadingShortfallDto)
  shortfall?: LoadingShortfallDto;
}
