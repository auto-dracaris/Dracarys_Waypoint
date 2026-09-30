import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Brand } from '../../../common/enums/brand.enum';
import { Depot } from '../../../common/enums/depot.enum';
import { DockType } from '../../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../../common/enums/parking-constraint.enum';

export class QueryOutletDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Brand)
  brand?: Brand;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(Depot)
  depot?: Depot;

  @IsOptional()
  @IsEnum(DockType)
  dockType?: DockType;

  @IsOptional()
  @IsEnum(ParkingConstraint)
  parkingConstraint?: ParkingConstraint;
}
