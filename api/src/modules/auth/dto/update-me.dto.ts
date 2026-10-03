import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone must be at most 20 characters' })
  phone?: string;

  // An image uploaded with `POST /images` (purpose `avatar`); null removes
  // the profile picture.
  @IsOptional()
  @IsUUID(undefined, { message: 'avatarImageId must be an image id' })
  avatarImageId?: string | null;
}
