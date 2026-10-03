import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ImagePurpose } from '../../../common/enums/image-purpose.enum';

/** The form fields that travel with the `image` file. */
export class UploadImageDto {
  @IsEnum(ImagePurpose, {
    message: `purpose must be one of: ${Object.values(ImagePurpose).join(', ')}`,
  })
  purpose: ImagePurpose;

  // Minted on the handset; becomes the image's id, so the same upload sent
  // twice is stored once.
  @IsOptional()
  @IsUUID(undefined, { message: 'clientId must be a UUID' })
  clientId?: string;
}
