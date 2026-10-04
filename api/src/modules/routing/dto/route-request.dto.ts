import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

class WaypointDto {
  @IsLatitude({ message: 'lat must be a latitude' })
  lat: number;

  @IsLongitude({ message: 'lng must be a longitude' })
  lng: number;
}

export class RouteRequestDto {
  // In the order they are visited.
  @ArrayMinSize(2, { message: 'waypoints must hold at least 2 points' })
  @ArrayMaxSize(25, { message: 'waypoints must hold at most 25 points' })
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints: WaypointDto[];

  // Which roads the vehicle may use. Defaults to the caller's own vehicle,
  // or a truck when they have none.
  @IsOptional()
  @IsEnum(VehicleType, {
    message: `profile must be one of: ${Object.values(VehicleType).join(', ')}`,
  })
  profile?: VehicleType;
}
