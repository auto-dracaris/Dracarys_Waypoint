import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IssueStatus, IssueType } from '../enums';

export class QueryIssueDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(IssueStatus, {
    message: `status must be one of: ${Object.values(IssueStatus).join(', ')}`,
  })
  status?: IssueStatus;

  @IsOptional()
  @IsEnum(IssueType, {
    message: `type must be one of: ${Object.values(IssueType).join(', ')}`,
  })
  type?: IssueType;

  @IsOptional()
  @IsUUID(undefined, { message: 'tripId must be a trip id' })
  tripId?: string;

  // An order reference, e.g. ORD0000012.
  @IsOptional()
  @IsString({ message: 'orderId must be an order reference' })
  @MaxLength(20, { message: 'orderId must be at most 20 characters' })
  orderId?: string;
}
