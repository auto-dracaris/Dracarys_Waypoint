import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { OtpPurpose } from '../enums/otp-purpose.enum';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  phone: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits long' })
  otp: string;

  @IsNotEmpty({ message: 'OTP ID is required' })
  @Type(() => Number)
  @IsInt({ message: 'OTP ID must be an integer' })
  otpId: number;

  /** Defaults to REGISTRATION on the server side if omitted. */
  @IsOptional()
  @IsEnum(OtpPurpose, { message: 'Purpose must be a valid OTP purpose' })
  purpose?: OtpPurpose;
}
