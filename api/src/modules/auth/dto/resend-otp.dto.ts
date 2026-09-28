import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  phone: string;
}
