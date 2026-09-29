import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator';

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
}
