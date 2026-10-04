import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DevicePlatform } from '../../../common/enums/device-platform.enum';

export class RegisterDeviceDto {
  // The handset's Firebase Cloud Messaging registration token.
  @IsString({ message: 'token must be a string' })
  @IsNotEmpty({ message: 'token is required' })
  @MaxLength(4096, { message: 'token is too long' })
  token: string;

  @IsEnum(DevicePlatform, {
    message: `platform must be one of: ${Object.values(DevicePlatform).join(', ')}`,
  })
  platform: DevicePlatform;
}
