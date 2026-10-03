import {
  BadGatewayException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { VehiclesRepository } from '../vehicles/repositories/vehicles.repository';
import { RouteRequestDto } from './dto/route-request.dto';

// How long to wait for the routing engine before giving up.
const TIMEOUT_MS = 8000;

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { distance: number; duration: number }[];
  }[];
}

/**
 * Road routes from the self-hosted OSRM engine (`osrm_setup/`), which has a
 * profile each for vans and trucks. A thin proxy with no table of its own.
 */
@Injectable()
export class RoutingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly vehiclesRepository: VehiclesRepository,
  ) {}

  async route(dto: RouteRequestDto, userId: number): Promise<ApiResponseDto> {
    const profile =
      dto.profile ??
      (await this.vehiclesRepository.findByDriver(userId))?.type ??
      VehicleType.TRUCK;
    // OSRM takes longitude first.
    const path = dto.waypoints
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');
    const base = this.configService.get<string>(
      'OSRM_URL',
      'http://localhost:8081',
    );

    let body: OsrmResponse;
    try {
      const response = await fetch(
        `${base}/route/v1/${profile}/${path}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      body = (await response.json()) as OsrmResponse;
    } catch {
      throw new BadGatewayException('The routing service is not reachable');
    }
    const route = body.routes?.[0];
    if (body.code !== 'Ok' || !route) {
      throw new UnprocessableEntityException(
        body.message ?? 'No road route was found between those points',
      );
    }

    return new ApiResponseDto(HttpStatus.OK, 'Route calculated', {
      profile,
      // [lng, lat] pairs, as GeoJSON orders them.
      geometry: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      legs: route.legs.map((leg) => ({
        distanceMeters: leg.distance,
        durationSeconds: leg.duration,
      })),
    });
  }
}
