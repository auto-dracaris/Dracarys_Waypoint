import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Brand } from '../../../common/enums/brand.enum';
import { DockType } from '../../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../../common/enums/parking-constraint.enum';
import { ClosesAfterOpens, HH_MM } from './window.validators';

export class CreateOutletDto {
  // The dataset identifier, e.g. OUT121.
  @IsNotEmpty({ message: 'Outlet ID is required' })
  @IsString({ message: 'Outlet ID must be a string' })
  @MaxLength(20, { message: 'Outlet ID must be at most 20 characters' })
  uniqueId: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  name?: string;

  @IsEnum(Brand, {
    message: `Brand must be one of: ${Object.values(Brand).join(', ')}`,
  })
  brand: Brand;

  // The district's name; its depot becomes the outlet's depot.
  @IsNotEmpty({ message: 'District is required' })
  @IsString({ message: 'District must be a string' })
  district: string;

  @IsEnum(DockType, {
    message: `Dock type must be one of: ${Object.values(DockType).join(', ')}`,
  })
  dockType: DockType;

  @IsOptional()
  @IsEnum(ParkingConstraint, {
    message: `Parking constraint must be one of: ${Object.values(ParkingConstraint).join(', ')}`,
  })
  parkingConstraint?: ParkingConstraint;

  @Matches(HH_MM, { message: 'Window start must be a time as HH:MM' })
  windowOpenTime: string;

  @Matches(HH_MM, { message: 'Window end must be a time as HH:MM' })
  @Validate(ClosesAfterOpens, ['windowOpenTime'])
  windowCloseTime: string;

  // The mall's access window is a pair; leave both out for outlets outside malls.
  @ValidateIf(
    (o: CreateOutletDto) =>
      o.mallWindowOpen != null || o.mallWindowClose != null,
  )
  @Matches(HH_MM, { message: 'Mall window start must be a time as HH:MM' })
  mallWindowOpen?: string | null;

  @ValidateIf(
    (o: CreateOutletDto) =>
      o.mallWindowOpen != null || o.mallWindowClose != null,
  )
  @Matches(HH_MM, { message: 'Mall window end must be a time as HH:MM' })
  @Validate(ClosesAfterOpens, ['mallWindowOpen'])
  mallWindowClose?: string | null;

  @IsOptional()
  @IsNotEmpty({ message: 'Address cannot be empty' })
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Contact phone must be a string' })
  @MaxLength(20, { message: 'Contact phone must be at most 20 characters' })
  contactPhone?: string;
}
