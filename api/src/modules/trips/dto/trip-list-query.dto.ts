import { IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TripListStatus } from '../../../common/enums/trip-list-status.enum';

export { TripListStatus };

export class TripListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TripListStatus)
  status?: TripListStatus;

  // Optional delivery day. Omit to retrieve trips across all dates.
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
