import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { Depot } from '../../../common/enums/depot.enum';

export class OrderDateQueryDto {
  // The delivery day (run) to look at. Left out, orders for every day are in scope.
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsEnum(Depot)
  depot?: Depot;
}
