import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { QueryVehicleDto } from '../dto/query-vehicle.dto';

// Ids are numeric, so responses carry the depot row for its name.
const VEHICLE_RELATIONS: FindOptionsRelations<Vehicle> = { depot: true };

// A cancelled trip no longer occupies the vehicle.
const LIVE_TRIP = 'trip.status <> :cancelled';
const cancelled = TripStatus.CANCELLED;

type VehicleSummaryKey =
  'total' | 'available' | 'inWorkshop' | 'unavailable' | 'needsReview';

@Injectable()
export class VehiclesRepository extends BaseRepository<Vehicle> {
  constructor(
    @InjectRepository(Vehicle)
    repository: Repository<Vehicle>,
  ) {
    super(repository);
  }

  findByVehicleId(vehicleId: number): Promise<Vehicle | null> {
    return this.repository.findOne({
      where: { id: vehicleId, isActive: true },
      relations: VEHICLE_RELATIONS,
    });
  }

  /** Each row carries `plannedTrips`, its live trip count on `date`. */
  findWithFilters(
    query: QueryVehicleDto,
    date: string,
  ): Promise<[Vehicle[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.repository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.depot', 'depot')
      .loadRelationCountAndMap(
        'vehicle.plannedTrips',
        'vehicle.trips',
        'trip',
        (trips) =>
          trips
            .where('trip.serviceDate = :date', { date })
            .andWhere(LIVE_TRIP, { cancelled }),
      )
      .where('vehicle.isActive = true');

    if (query.uniqueId) {
      qb.andWhere('vehicle.uniqueId = :uniqueId', { uniqueId: query.uniqueId });
    }
    if (query.depot) {
      qb.andWhere('depot.name = :depot', { depot: query.depot });
    }
    if (query.type) {
      qb.andWhere('vehicle.type = :type', { type: query.type });
    }
    if (query.isRefrigerated !== undefined) {
      qb.andWhere('vehicle.isRefrigerated = :isRefrigerated', {
        isRefrigerated: query.isRefrigerated,
      });
    }

    return qb
      .orderBy('vehicle.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * The vehicle with its depot, driver and live trips on `date`, each trip
   * with its stops in unloading order and the outlet each one serves. Only the
   * driver's public columns are selected, so the password hash never leaves
   * the database.
   */
  findDetail(vehicleId: number, date: string): Promise<Vehicle | null> {
    return this.repository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.depot', 'depot')
      .leftJoin('vehicle.driver', 'driver')
      .addSelect([
        'driver.id',
        'driver.firstName',
        'driver.lastName',
        'driver.phone',
      ])
      .leftJoinAndSelect(
        'vehicle.trips',
        'trip',
        `trip.serviceDate = :date AND ${LIVE_TRIP}`,
        { date, cancelled },
      )
      .leftJoinAndSelect('trip.stops', 'stop')
      .leftJoin('stop.order', 'order')
      .addSelect(['order.id', 'order.outletId'])
      .leftJoin('order.outlet', 'outlet')
      .addSelect(['outlet.id', 'outlet.uniqueId', 'outlet.name'])
      .where('vehicle.id = :vehicleId AND vehicle.isActive = true', {
        vehicleId,
      })
      .orderBy('trip.tripNo', 'ASC')
      .addOrderBy('stop.seq', 'ASC')
      .getOne();
  }

  /** Planned fuel of the vehicle's live trips in the ISO week containing `date`. */
  async sumPlannedFuel(vehicleId: number, date: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('vehicle')
      .leftJoin(
        'vehicle.trips',
        'trip',
        // Postgres weeks start on Monday, which is the ISO week.
        `${LIVE_TRIP} AND date_trunc('week', trip.serviceDate) = date_trunc('week', CAST(:date AS date))`,
        { date, cancelled },
      )
      .select('COALESCE(SUM(trip.plannedFuelL), 0)', 'sum')
      .where('vehicle.id = :vehicleId', { vehicleId })
      .getRawOne<{ sum: string }>();
    return parseFloat(row?.sum ?? '0');
  }

  /** Trips not yet loaded (draft or planned) from `fromDate` on. */
  async countOpenTrips(vehicleId: number, fromDate: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('vehicle')
      .leftJoin(
        'vehicle.trips',
        'trip',
        'trip.serviceDate >= :fromDate AND trip.status IN (:...open)',
        { fromDate, open: [TripStatus.DRAFT, TripStatus.PLANNED] },
      )
      .select('COUNT(trip.id)', 'count')
      .where('vehicle.id = :vehicleId', { vehicleId })
      .getRawOne<{ count: string }>();
    return parseInt(row?.count ?? '0', 10);
  }

  /**
   * The status cards: fleet counts by status, plus `needsReview`, the
   * vehicles that are not available yet still hold draft or planned trips
   * from `fromDate` on.
   */
  async summarise(
    depot: string | undefined,
    fromDate: string,
  ): Promise<Record<VehicleSummaryKey, number>> {
    const qb = this.repository
      .createQueryBuilder('vehicle')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE vehicle.status = :ok)', 'available')
      .addSelect(
        'COUNT(*) FILTER (WHERE vehicle.status = :workshop)',
        'inWorkshop',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE vehicle.status = :breakdown)',
        'unavailable',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE vehicle.status <> :ok AND EXISTS (
          SELECT 1 FROM trips t
          WHERE t.vehicle_id = vehicle.id
            AND t.service_date >= :fromDate
            AND t.status IN (:...open)
        ))`,
        'needsReview',
      )
      .where('vehicle.isActive = true')
      .setParameters({
        ok: VehicleStatus.AVAILABLE,
        workshop: VehicleStatus.IN_WORKSHOP,
        breakdown: VehicleStatus.BREAKDOWN,
        fromDate,
        open: [TripStatus.DRAFT, TripStatus.PLANNED],
      });

    if (depot) {
      qb.innerJoin('vehicle.depot', 'depot', 'depot.name = :depot', { depot });
    }

    const row = (await qb.getRawOne<Record<VehicleSummaryKey, string>>())!;
    return {
      total: parseInt(row.total, 10),
      available: parseInt(row.available, 10),
      inWorkshop: parseInt(row.inWorkshop, 10),
      unavailable: parseInt(row.unavailable, 10),
      needsReview: parseInt(row.needsReview, 10),
    };
  }
}
