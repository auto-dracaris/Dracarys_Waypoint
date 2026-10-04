import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IssueType } from '../../../common/enums/issue-type.enum';

/**
 * One body for every reporter. Which types a caller may use, and what the
 * issue has to name, depend on their role; the service checks that.
 */
export class CreateIssueDto {
  // Minted on the handset; becomes the issue's id, so the same report sent
  // twice is stored once.
  @IsOptional()
  @IsUUID(undefined, { message: 'clientId must be a UUID' })
  clientId?: string;

  @IsEnum(IssueType, {
    message: `type must be one of: ${Object.values(IssueType).join(', ')}`,
  })
  type: IssueType;

  // The trip it happened on. Loaders and drivers name it; for a store manager
  // it follows from the order.
  @IsOptional()
  @IsUUID(undefined, { message: 'tripId must be a trip id' })
  tripId?: string;

  // The order it is about, as its reference (ORD0000012).
  @IsOptional()
  @IsString({ message: 'orderId must be an order reference' })
  @MaxLength(20, { message: 'orderId must be at most 20 characters' })
  orderId?: string;

  @IsOptional()
  @IsInt({ message: 'affectedCases must be a whole number' })
  @Min(1, { message: 'affectedCases must be at least 1' })
  affectedCases?: number;

  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @MaxLength(500, { message: 'note must be at most 500 characters' })
  note?: string;

  // An image uploaded with `POST /images`, purpose `issue_photo`.
  @IsOptional()
  @IsUUID(undefined, { message: 'photoImageId must be an image id' })
  photoImageId?: string;

  // The reporter's own clock, for an issue noted while offline.
  @IsOptional()
  @IsDateString({}, { message: 'recordedAt must be an ISO timestamp' })
  recordedAt?: string;
}
