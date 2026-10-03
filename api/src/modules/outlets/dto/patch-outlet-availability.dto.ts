import { IsBoolean } from 'class-validator';

export class PatchOutletAvailabilityDto {
  @IsBoolean({ message: 'isAvailable must be true or false' })
  isAvailable: boolean;
}
