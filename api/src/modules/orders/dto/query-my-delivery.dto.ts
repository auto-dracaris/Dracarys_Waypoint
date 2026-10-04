import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Where a delivery to the outlet stands: still to arrive, handed over but not
 * yet confirmed by the store, or finished (confirmed, or not delivered).
 */
export const DELIVERY_STAGES = ['upcoming', 'awaiting', 'completed'] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];

export class QueryMyDeliveryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DELIVERY_STAGES, {
    message: `stage must be one of: ${DELIVERY_STAGES.join(', ')}`,
  })
  stage?: DeliveryStage;

  // The day the trip runs.
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  // An order reference, e.g. ORD0000012 or just 12.
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MaxLength(50, { message: 'search must be at most 50 characters' })
  search?: string;
}
