import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';

export const MY_ORDER_SORT_FIELDS = [
  'reference',
  'requestedDate',
  'tempRequirement',
  'orderUnits',
  'status',
] as const;

export class QueryMyOrderDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsEnum(TempRequirement)
  tempRequirement?: TempRequirement;

  @IsOptional()
  @IsIn(MY_ORDER_SORT_FIELDS)
  sortBy?: (typeof MY_ORDER_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus;

  // An order reference, e.g. ORD0000012 or just 12.
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MaxLength(50, { message: 'search must be at most 50 characters' })
  search?: string;
}
