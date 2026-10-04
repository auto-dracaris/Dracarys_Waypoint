import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DepotsRepository } from '../../common/repositories/depots.repository';
import { UserRole } from '../../common/enums/user-role.enum';
import { TripStopStatus } from '../../common/enums/trip-stop-status.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum';
import { today } from '../../common/utils/date.util';
import { tripIdAt } from '../../common/utils/vehicle.util';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { UsersRepository } from '../users/repositories/users.repository';
import {
  LOCATION_CLIENT,
  LOCATION_STORE_PATTERN,
  LocationJob,
} from './constants/location.constants';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { LocationBatchDto } from './dto/location-batch.dto';
import { PatchVehicleStatusDto } from './dto/patch-vehicle-status.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehicleDateQueryDto } from './dto/vehicle-date-query.dto';
import { VehicleSummaryQueryDto } from './dto/vehicle-summary-query.dto';
import { VehiclesRepository } from './repositories/vehicles.repository';

// Postgres's unique-violation code; `vehicles.driver_id` is unique.
const UNIQUE_VIOLATION = '23505';

// While the broker is unreachable the client holds a publish until it is back;
// the handset is told to retry instead of being left waiting.
const PUBLISH_TIMEOUT_MS = 5000;

// The outcomes a driver records; anything else is still ahead of the vehicle.
const RECORDED_STOP = new Set([
  TripStopStatus.DELIVERED,
  TripStopStatus.PARTIAL,
  TripStopStatus.FAILED,
]);

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly depotsRepository: DepotsRepository,
    private readonly usersRepository: UsersRepository,
    @Inject(LOCATION_CLIENT) private readonly locationClient: ClientProxy,
  ) {}

  /** `actorId` is the dispatcher making the call, recorded as `created_by`. */
  async create(
    dto: CreateVehicleDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const depot = await this.depotsRepository.findByName(dto.depot);
    if (!depot) {
      throw new BadRequestException('Depot not found');
    }

    const { depot: _depot, ...fields } = dto;
    let saved: Vehicle;
    try {
      saved = await this.vehiclesRepository.save(
        this.vehiclesRepository.create({
          ...fields,
          depotId: depot.id,
          createdById: actorId,
          updatedById: actorId,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'Vehicle ID or registration number already exists',
        );
      }
      throw error;
    }

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Vehicle created successfully',
      await this.buildDetail(saved.id, today()),
    );
  }

  async findAll(query: QueryVehicleDto): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [items, total] = await this.vehiclesRepository.findWithFilters(
      query,
      query.date ?? today(),
    );

    return new ApiResponseDto(
      HttpStatus.OK,
      'Vehicles retrieved successfully',
      {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    );
  }

  async summary(query: VehicleSummaryQueryDto): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Vehicle summary retrieved successfully',
      await this.vehiclesRepository.summarise(
        query.depot,
        query.date ?? today(),
      ),
    );
  }

  async findOne(
    vehicleId: number,
    query: VehicleDateQueryDto,
  ): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Vehicle retrieved successfully',
      await this.buildDetail(vehicleId, query.date ?? today()),
    );
  }

  /** `actorId` is the dispatcher making the call, recorded as `updated_by`. */
  async updateStatus(
    vehicleId: number,
    dto: PatchVehicleStatusDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const vehicle = await this.findOrThrow(vehicleId);
    const available = dto.status === VehicleStatus.AVAILABLE;

    vehicle.status = dto.status;
    vehicle.updatedById = actorId;
    const saved = await this.vehiclesRepository.save(vehicle);

    // Trips already planned on a vehicle that just became unusable need the
    // dispatcher's review before the plan is published.
    const affectedTrips = available
      ? 0
      : await this.vehiclesRepository.countOpenTrips(vehicleId, today());

    return new ApiResponseDto(
      HttpStatus.OK,
      'Vehicle status updated successfully',
      { ...saved, affectedTrips },
    );
  }

  async assignDriver(
    vehicleId: number,
    dto: AssignDriverDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const vehicle = await this.findOrThrow(vehicleId);

    if (dto.driverId !== null) {
      const driver = await this.usersRepository.findById(dto.driverId);
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }
      if (
        driver.role !== UserRole.DRIVER ||
        driver.status !== UserStatus.ACTIVE
      ) {
        throw new BadRequestException('User is not an active driver');
      }
    }

    vehicle.driverId = dto.driverId;
    vehicle.updatedById = actorId;
    try {
      await this.vehiclesRepository.save(vehicle);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'Driver is already assigned to another vehicle',
        );
      }
      throw error;
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      dto.driverId === null
        ? 'Driver unassigned successfully'
        : 'Driver assigned successfully',
      await this.buildDetail(vehicleId, today()),
    );
  }

  /**
   * Position fixes from the handset of the vehicle's own driver, batched so
   * ones taken offline can follow later. The request only queues them — this
   * is the busiest route there is, so the writes happen in
   * `VehicleLocationsConsumer`, off the request path.
   */
  async addLocations(
    vehicleId: number,
    dto: LocationBatchDto,
    driverId: number,
  ): Promise<ApiResponseDto> {
    const vehicle = await this.findOrThrow(vehicleId);
    if (vehicle.driverId !== driverId) {
      throw new ForbiddenException('You are not the driver of this vehicle');
    }

    const job: LocationJob = {
      vehicleId,
      driverId,
      receivedAt: new Date().toISOString(),
      points: dto.points,
    };
    // Unlike an SMS, a batch that was not queued is the caller's problem: the
    // handset keeps its fixes until it gets a 202. If the publish does land
    // after the timeout, the retry is harmless — rows are keyed by `clientId`.
    try {
      await lastValueFrom(
        this.locationClient
          .emit(LOCATION_STORE_PATTERN, job)
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        { defaultValue: undefined },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to queue locations for vehicle ${vehicleId}: ${error?.message || error}`,
        error?.stack,
      );
      throw new ServiceUnavailableException(
        'Locations could not be queued, send them again',
      );
    }

    return new ApiResponseDto(HttpStatus.ACCEPTED, 'Locations queued', {
      received: dto.points.length,
    });
  }

  /** The consumer's half of `addLocations`: writes a queued batch. */
  async storeLocations(job: LocationJob): Promise<void> {
    const times = job.points.map((point) => Date.parse(point.recordedAt));
    const trips = await this.vehiclesRepository.findTripsRunningBetween(
      job.vehicleId,
      new Date(Math.min(...times)),
      new Date(Math.max(...times)),
    );
    await this.vehiclesRepository.saveLocations(
      job.vehicleId,
      job.points.map((point) => {
        const recordedAt = new Date(point.recordedAt);
        return {
          id: point.clientId,
          tripId: tripIdAt(trips, recordedAt),
          lat: point.lat,
          lng: point.lng,
          heading: point.heading ?? null,
          speedKmh: point.speedKmh ?? null,
          recordedAt,
          receivedAt: new Date(job.receivedAt),
          createdById: job.driverId,
          updatedById: job.driverId,
        };
      }),
    );
  }

  private async findOrThrow(vehicleId: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findByVehicleId(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${vehicleId}" not found`);
    }
    return vehicle;
  }

  /** The detail panel: the vehicle, its driver, fuel left this week and the day's trips. */
  private async buildDetail(vehicleId: number, date: string) {
    const vehicle = await this.vehiclesRepository.findDetail(vehicleId, date);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${vehicleId}" not found`);
    }
    const plannedFuel = await this.vehiclesRepository.sumPlannedFuel(
      vehicleId,
      date,
    );
    const { trips = [], ...rest } = vehicle;

    return {
      ...rest,
      // Rounded because the two decimals are subtracted as floats.
      fuelQuotaRemainingL:
        Math.round((vehicle.weeklyFuelQuotaL - plannedFuel) * 100) / 100,
      trips: trips.map((trip) => {
        const stops = trip.stops ?? [];
        // Stops arrive in unloading order, so the first open one is next.
        const open = stops.filter((stop) => !RECORDED_STOP.has(stop.status));
        const openOutlets = new Set(open.map((stop) => stop.order?.outletId));
        const outlets = new Set(stops.map((stop) => stop.order?.outletId));
        const nextOutlet = open[0]?.order?.outlet;
        // Build unique outlet timeline in reach order
        const timeline: {
          seq: number;
          outletId: string;
          outletName: string | null;
          plannedArrivalAt: Date;
          status: string;
          orderCount: number;
        }[] = [];
        const seenOutlets = new Set<string>();
        for (const stop of stops) {
          const outlet = stop.order?.outlet;
          const outletId = outlet?.uniqueId ?? `OUT${stop.order?.outletId ?? ''}`;
          if (!seenOutlets.has(outletId)) {
            seenOutlets.add(outletId);
            timeline.push({
              seq: timeline.length + 1,
              outletId,
              outletName: outlet?.name ?? null,
              plannedArrivalAt: stop.plannedArrivalAt,
              status: stop.status,
              orderCount: 1,
            });
          } else {
            const existing = timeline.find((t) => t.outletId === outletId);
            if (existing) {
              existing.orderCount += 1;
            }
          }
        }

        return {
          id: trip.id,
          tripNo: trip.tripNo,
          status: trip.status,
          brand: trip.brand,
          plannedDepartAt: trip.plannedDepartAt,
          plannedEndAt: new Date(
            trip.plannedDepartAt.getTime() + trip.plannedMinutes * 60_000,
          ),
          plannedMinutes: trip.plannedMinutes,
          plannedKm: trip.plannedKm,
          plannedFuelL: trip.plannedFuelL,
          // Each order is its own stop row; a "stop" on the page is an outlet.
          stops: outlets.size,
          // An outlet counts once every order for it has an outcome.
          recordedStops: outlets.size - openOutlets.size,
          nextStop: nextOutlet
            ? (nextOutlet.name ?? nextOutlet.uniqueId)
            : null,
          orders: stops.length,
          timeline,
        };
      }),
    };
  }
}
