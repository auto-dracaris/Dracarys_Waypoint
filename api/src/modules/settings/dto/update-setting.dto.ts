import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsNotEmpty({ message: 'Value is required' })
  @IsString({ message: 'Value must be a string' })
  value: string;
}
