import { IntersectionType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Brand } from '../../../common/enums/brand.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { OrderDateQueryDto } from './order-date-query.dto';

/**
 * Where an order stands. When a run (`date`) is being looked at, `deferred` is
 * every order that left it, whatever became of it on a later one.
 */
export const ORDER_STAGES = [
  'awaiting',
  'allocated',
  'deferred',
  'delivered',
  'cancelled',
] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

export const ORDER_SORT_KEYS = [
  'id',
  'outlet',
  'tempRequirement',
  'requestedDate',
  'orderWeightKg',
  'orderVolumeM3',
  'status',
] as const;
export type OrderSortKey = (typeof ORDER_SORT_KEYS)[number];

export class QueryOrderDto extends IntersectionType(
  PaginationQueryDto,
  OrderDateQueryDto,
) {
  @IsOptional()
  @IsEnum(ORDER_STAGES, {
    message: `stage must be one of: ${ORDER_STAGES.join(', ')}`,
  })
  stage?: OrderStage;

  @IsOptional()
  @IsEnum(Brand)
  brand?: Brand;

  @IsOptional()
  @IsEnum(TempRequirement)
  tempRequirement?: TempRequirement;

  // Matches an order reference (ORD0000012 or 12), outlet id or outlet name.
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MaxLength(50, { message: 'search must be at most 50 characters' })
  search?: string;

  @IsOptional()
  @IsEnum(ORDER_SORT_KEYS, {
    message: `sortBy must be one of: ${ORDER_SORT_KEYS.join(', ')}`,
  })
  sortBy?: OrderSortKey;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortDir must be asc or desc' })
  sortDir?: 'asc' | 'desc';
}
