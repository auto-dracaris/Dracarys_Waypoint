import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Depot } from '../../../common/enums/depot.enum';
import { VehicleTemp } from '../../../common/enums/vehicle-temp.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

export class QueryVehicleDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Depot)
  depot?: Depot;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsEnum(VehicleTemp)
  temp?: VehicleTemp;
}
