import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IssueType } from '../../../common/enums/issue-type.enum';
import { DriverActionDto } from './driver-action.dto';

// Images are uploaded first with `POST /images`; these bodies name them by id.

export class DeliveryProofDto extends DriverActionDto {
  // The outlet staff member who took the goods.
  @IsNotEmpty({ message: 'receivedBy is required' })
  @IsString({ message: 'receivedBy must be a string' })
  @MaxLength(150, { message: 'receivedBy must be at most 150 characters' })
  receivedBy: string;

  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @MaxLength(500, { message: 'notes must be at most 500 characters' })
  notes?: string;

  // At least one of the two; the service checks, since it spans both fields.
  @IsOptional()
  @IsUUID(undefined, { message: 'signatureImageId must be an image id' })
  signatureImageId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'photoImageId must be an image id' })
  photoImageId?: string;
}

/** What the driver's issue form offers at a stop. */
export const DELIVERY_ISSUE_TYPES = [
  IssueType.DAMAGED,
  IssueType.TEMPERATURE_BREACH,
  IssueType.SHORT_DELIVERY,
  IssueType.WRONG_ITEMS,
  IssueType.OTHER,
] as const;

export class DeliveryIssueDto extends DriverActionDto {
  @IsEnum(DELIVERY_ISSUE_TYPES, {
    message: `type must be one of: ${DELIVERY_ISSUE_TYPES.join(', ')}`,
  })
  type: (typeof DELIVERY_ISSUE_TYPES)[number];

  @IsInt({ message: 'affectedCases must be a whole number' })
  @Min(1, { message: 'affectedCases must be at least 1' })
  affectedCases: number;

  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @MaxLength(500, { message: 'note must be at most 500 characters' })
  note?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'photoImageId must be an image id' })
  photoImageId?: string;
}
