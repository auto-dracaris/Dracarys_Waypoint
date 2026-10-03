import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
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
