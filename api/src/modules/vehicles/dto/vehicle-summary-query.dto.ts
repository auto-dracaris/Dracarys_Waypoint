import { IsEnum, IsOptional } from 'class-validator';
import { Depot } from '../../../common/enums/depot.enum';
import { VehicleDateQueryDto } from './vehicle-date-query.dto';

export class VehicleSummaryQueryDto extends VehicleDateQueryDto {
  @IsOptional()
  @IsEnum(Depot)
  depot?: Depot;
}
