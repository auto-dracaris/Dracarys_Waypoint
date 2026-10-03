import { IsInt, ValidateIf } from 'class-validator';

export class AssignDriverDto {
  @ValidateIf((dto: AssignDriverDto) => dto.driverId !== null)
  @IsInt({ message: 'driverId must be a user id or null' })
  driverId: number | null;
}
