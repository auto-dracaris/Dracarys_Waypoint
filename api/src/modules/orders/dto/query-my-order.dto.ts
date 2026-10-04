import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus } from '../../../common/enums/order-status.enum';

export class QueryMyOrderDto extends PaginationQueryDto {
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
