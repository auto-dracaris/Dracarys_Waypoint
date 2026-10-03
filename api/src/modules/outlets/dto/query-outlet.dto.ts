import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Brand } from '../../../common/enums/brand.enum';
import { Depot } from '../../../common/enums/depot.enum';
import { DockType } from '../../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../../common/enums/parking-constraint.enum';

export const OUTLET_SORT_KEYS = [
  'uniqueId',
  'name',
  'brand',
  'district',
  'windowOpenTime',
  'parkingConstraint',
] as const;
export type OutletSortKey = (typeof OUTLET_SORT_KEYS)[number];

export class QueryOutletDto extends PaginationQueryDto {
  // The dataset identifier, e.g. OUT001.
  @IsOptional()
  @IsString()
  uniqueId?: string;

  // Matches the outlet id, name, district or depot name, case-insensitively.
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;

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

  // Query strings arrive as text, so map the two literals and let anything
  // else fall through to `@IsBoolean` to be rejected.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'isAvailable must be true or false' })
  isAvailable?: boolean;

  @IsOptional()
  @IsEnum(OUTLET_SORT_KEYS, {
    message: `sortBy must be one of: ${OUTLET_SORT_KEYS.join(', ')}`,
  })
  sortBy?: OutletSortKey;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortDir must be asc or desc' })
  sortDir?: 'asc' | 'desc';
}
