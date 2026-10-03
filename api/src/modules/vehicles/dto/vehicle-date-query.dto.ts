import { IsDateString, IsOptional, Matches } from 'class-validator';

export class VehicleDateQueryDto {
  // The delivery day trips and fuel are reported for. Defaults to today.
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
