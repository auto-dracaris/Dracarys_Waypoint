import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { UsersRepository } from '../users/repositories/users.repository';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { PatchVehicleStatusDto } from './dto/patch-vehicle-status.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehicleDateQueryDto } from './dto/vehicle-date-query.dto';
import { VehicleSummaryQueryDto } from './dto/vehicle-summary-query.dto';
import { DepotsRepository } from './repositories/depots.repository';
import { VehiclesRepository } from './repositories/vehicles.repository';

// Postgres's unique-violation code; `vehicles.driver_id` is unique.
const UNIQUE_VIOLATION = '23505';

/** Today's date (YYYY-MM-DD) where Waypoint operates, whatever the server's clock zone. */
const today = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(
    new Date(),
  );

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly depotsRepository: DepotsRepository,
    private readonly usersRepository: UsersRepository,
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
        return {
          id: trip.id,
          tripNo: trip.tripNo,
          status: trip.status,
          plannedDepartAt: trip.plannedDepartAt,
          plannedEndAt: new Date(
            trip.plannedDepartAt.getTime() + trip.plannedMinutes * 60_000,
          ),
          // Each order is its own stop row; a "stop" on the page is an outlet.
          stops: new Set(stops.map((stop) => stop.order?.outletId)).size,
          orders: stops.length,
        };
      }),
    };
  }
}
