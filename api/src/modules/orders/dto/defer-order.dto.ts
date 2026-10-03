import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeferralReason } from '../../../common/enums/deferral-reason.enum';

export class DeferOrderDto {
  @IsEnum(DeferralReason, {
    message: `Reason must be one of: ${Object.values(DeferralReason).join(', ')}`,
  })
  reason: DeferralReason;

  @IsOptional()
  @IsString({ message: 'Reason note must be a string' })
  @MaxLength(300, { message: 'Reason note must be at most 300 characters' })
  reasonNote?: string;
}
