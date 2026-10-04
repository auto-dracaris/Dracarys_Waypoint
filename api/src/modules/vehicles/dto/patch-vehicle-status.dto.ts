import { IsEnum, IsNotEmpty } from 'class-validator';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum';

export class PatchVehicleStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(VehicleStatus, {
    message: `Status must be one of: ${Object.values(VehicleStatus).join(', ')}`,
  })
  status: VehicleStatus;
}
