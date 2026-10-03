import { IsDateString, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TripListQueryDto extends PaginationQueryDto {
  // The delivery day. Defaults to today.
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'date must be a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  // Only trips changed after this instant, so a handset that was offline
  // fetches just what moved.
  @IsOptional()
  @IsDateString({}, { message: 'updatedSince must be an ISO timestamp' })
  updatedSince?: string;
}
