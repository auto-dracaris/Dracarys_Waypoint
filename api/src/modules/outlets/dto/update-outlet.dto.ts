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
import { DockType } from '../../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../../common/enums/parking-constraint.enum';
import { ClosesAfterOpens, HH_MM } from './window.validators';

export class UpdateOutletDto {
  // The window is replaced as a pair, so the close can be checked against the open.
  @ValidateIf(
    (o: UpdateOutletDto) =>
      o.windowOpenTime !== undefined || o.windowCloseTime !== undefined,
  )
  @Matches(HH_MM, { message: 'Window start must be a time as HH:MM' })
  windowOpenTime?: string;

  @ValidateIf(
    (o: UpdateOutletDto) =>
      o.windowOpenTime !== undefined || o.windowCloseTime !== undefined,
  )
  @Matches(HH_MM, { message: 'Window end must be a time as HH:MM' })
  @Validate(ClosesAfterOpens, ['windowOpenTime'])
  windowCloseTime?: string;

  // The mall's access window is likewise a pair; send both as null to clear it.
  @ValidateIf(
    (o: UpdateOutletDto) =>
      o.mallWindowOpen != null || o.mallWindowClose != null,
  )
  @Matches(HH_MM, { message: 'Mall window start must be a time as HH:MM' })
  mallWindowOpen?: string | null;

  @ValidateIf(
    (o: UpdateOutletDto) =>
      o.mallWindowOpen != null || o.mallWindowClose != null,
  )
  @Matches(HH_MM, { message: 'Mall window end must be a time as HH:MM' })
  @Validate(ClosesAfterOpens, ['mallWindowOpen'])
  mallWindowClose?: string | null;

  // Moving to a district of another depot moves the outlet to that depot.
  @IsOptional()
  @IsNotEmpty({ message: 'District cannot be empty' })
  @IsString({ message: 'District must be a string' })
  district?: string;

  @IsOptional()
  @IsEnum(DockType, {
    message: `Dock type must be one of: ${Object.values(DockType).join(', ')}`,
  })
  dockType?: DockType;

  @IsOptional()
  @IsEnum(ParkingConstraint, {
    message: `Parking constraint must be one of: ${Object.values(ParkingConstraint).join(', ')}`,
  })
  parkingConstraint?: ParkingConstraint;

  @IsOptional()
  @IsNotEmpty({ message: 'Address cannot be empty' })
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Contact phone must be a string' })
  @MaxLength(20, { message: 'Contact phone must be at most 20 characters' })
  contactPhone?: string;
}
