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

interface OsrmStep {
  geometry: { coordinates: [number, number][] };
}

interface OsrmLeg {
  distance: number;
  duration: number;
  steps?: OsrmStep[];
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: OsrmLeg[];
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

  async route(dto: RouteRequestDto, userId?: number): Promise<ApiResponseDto> {
    const profile =
      dto.profile ??
      (userId
        ? (await this.vehiclesRepository.findByDriver(userId))?.type
        : undefined) ??
      VehicleType.VAN;
    // OSRM takes longitude first.
    const path = dto.waypoints
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');
    const base = this.configService
      .get<string>('OSRM_URL', 'http://localhost:8081')
      .replace(/\/+$/, '');

    let body: OsrmResponse;
    try {
      let response = await fetch(
        `${base}/route/v1/van/${path}?overview=full&geometries=geojson&steps=true`,
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      );

      // If the primary profile (e.g. truck) fails or returns bad gateway, try van profile
      if (!response.ok && profile !== VehicleType.VAN) {
        try {
          const fallbackRes = await fetch(
            `${base}/route/v1/${VehicleType.VAN}/${path}?overview=full&geometries=geojson&steps=true`,
            { signal: AbortSignal.timeout(TIMEOUT_MS) },
          );
          if (fallbackRes.ok) {
            response = fallbackRes;
          }
        } catch {
          // Keep original response for error handling
        }
      }

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
      legs: route.legs.map((leg) => {
        const legCoords: [number, number][] = [];
        if (leg.steps) {
          for (const step of leg.steps) {
            for (const coord of step.geometry.coordinates) {
              if (
                legCoords.length === 0 ||
                legCoords[legCoords.length - 1][0] !== coord[0] ||
                legCoords[legCoords.length - 1][1] !== coord[1]
              ) {
                legCoords.push(coord);
              }
            }
          }
        }
        return {
          distanceMeters: leg.distance,
          durationSeconds: leg.duration,
          geometry: legCoords.length > 0 ? legCoords : undefined,
        };
      }),
    });
  }
}
