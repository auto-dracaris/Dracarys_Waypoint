import { IsDateString, IsEnum, Matches } from 'class-validator';
import { Depot } from '../../../common/enums/depot.enum';

/** A plan is one depot's deliveries for one day. */
export class PlanQueryDto {
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsEnum(Depot, {
    message: `depot must be one of: ${Object.values(Depot).join(', ')}`,
  })
  depot: Depot;
}
