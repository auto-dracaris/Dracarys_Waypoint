import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PriorityIndexStatus } from '../../../common/enums/priority-index-status.enum';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { VehicleStatus } from '../../../common/enums/vehicle-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Calendar } from '../../../database/entities/calendar.entity';
import { Depot } from '../../../database/entities/depot.entity';
import { District } from '../../../database/entities/district.entity';
import { OrderDeferral } from '../../../database/entities/order-deferral.entity';
import { Order } from '../../../database/entities/order.entity';
import { PriorityIndex } from '../../../database/entities/priority-index.entity';
import { ServiceAllowance } from '../../../database/entities/service-allowance.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
import { Trip } from '../../../database/entities/trip.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';

/** A trip to save, with its stops in unloading order. */
export type DraftTrip = Omit<Partial<Trip>, 'stops'> & {
  stops: Partial<TripStop>[];
};

@Injectable()
export class PlanningRepository extends BaseRepository<Trip> {
  constructor(
    @InjectRepository(Trip)
    repository: Repository<Trip>,
  ) {
    super(repository);
  }

  private get manager(): EntityManager {
    return this.repository.manager;
  }

  findDepot(name: string): Promise<Depot | null> {
    return this.manager.getRepository(Depot).findOneBy({ name });
  }

  findCalendarDay(date: string): Promise<Calendar | null> {
    return this.manager.getRepository(Calendar).findOneBy({ date });
  }

  findDistricts(depotId: number): Promise<District[]> {
    return this.manager.getRepository(District).findBy({ depotId });
  }

  findServiceAllowances(): Promise<ServiceAllowance[]> {
    return this.manager.getRepository(ServiceAllowance).find();
  }

  /** The depot's vehicles that can be sent out. */
  findAvailableVehicles(depotId: number): Promise<Vehicle[]> {
    return this.manager.getRepository(Vehicle).find({
      where: { depotId, status: VehicleStatus.AVAILABLE, isActive: true },
      order: { id: 'ASC' },
    });
  }

  /**
   * Fuel each vehicle has already committed in the ISO week of `date`, by
   * vehicle id. The draft for `date` itself is left out, since a run replaces it.
   */
  async sumCommittedFuel(
    vehicleIds: number[],
    date: string,
  ): Promise<Map<number, number>> {
    if (!vehicleIds.length) {
      return new Map();
    }
    const rows = await this.repository
      .createQueryBuilder('trip')
      .select('trip.vehicleId', 'vehicleId')
      .addSelect('SUM(trip.plannedFuelL)', 'fuel')
      .where('trip.vehicleId IN (:...vehicleIds)', { vehicleIds })
      // Postgres weeks start on Monday, which is the ISO week.
      .andWhere(
        `date_trunc('week', trip.serviceDate) = date_trunc('week', CAST(:date AS date))`,
        { date },
      )
      .andWhere('trip.status <> :cancelled', {
        cancelled: TripStatus.CANCELLED,
      })
      .andWhere('NOT (trip.status = :draft AND trip.serviceDate = :date)', {
        draft: TripStatus.DRAFT,
      })
      .groupBy('trip.vehicleId')
      .getRawMany<{ vehicleId: number; fuel: string }>();
    return new Map(rows.map((row) => [row.vehicleId, parseFloat(row.fuel)]));
  }

  /** How many times each order has been deferred, by order id. */
  async countDeferrals(orderIds: number[]): Promise<Map<number, number>> {
    if (!orderIds.length) {
      return new Map();
    }
    const rows = await this.manager
      .getRepository(OrderDeferral)
      .createQueryBuilder('d')
      .select('d.orderId', 'orderId')
      .addSelect('COUNT(*)', 'count')
      .where('d.orderId IN (:...orderIds)', { orderIds })
      .groupBy('d.orderId')
      .getRawMany<{ orderId: number; count: string }>();
    return new Map(rows.map((row) => [row.orderId, parseInt(row.count, 10)]));
  }

  /** The delivery day of each outlet's last delivered order, by outlet id. */
  async findLastDeliveries(outletIds: number[]): Promise<Map<number, string>> {
    if (!outletIds.length) {
      return new Map();
    }
    const rows = await this.manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .select('o.outletId', 'outletId')
      .addSelect(`TO_CHAR(MAX(o.requestedDate), 'YYYY-MM-DD')`, 'date')
      .where('o.outletId IN (:...outletIds)', { outletIds })
      .andWhere('o.status = :delivered', { delivered: OrderStatus.DELIVERED })
      .groupBy('o.outletId')
      .getRawMany<{ outletId: number; date: string }>();
    return new Map(rows.map((row) => [row.outletId, row.date]));
  }

  /**
   * The depot's live trips on `date`, each with its vehicle, district and
   * stops in unloading order with the order and outlet each one serves.
   */
  findTrips(depotId: number, date: string): Promise<Trip[]> {
    return this.repository
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.vehicle', 'vehicle')
      .innerJoinAndSelect('trip.district', 'district')
      .leftJoinAndSelect('trip.stops', 'stop')
      .leftJoinAndSelect('stop.order', 'order')
      .leftJoinAndSelect('order.outlet', 'outlet')
      .where('trip.depotId = :depotId AND trip.serviceDate = :date', {
        depotId,
        date,
      })
      .andWhere('trip.status <> :cancelled', {
        cancelled: TripStatus.CANCELLED,
      })
      .orderBy('vehicle.uniqueId', 'ASC')
      .addOrderBy('trip.tripNo', 'ASC')
      .addOrderBy('stop.seq', 'ASC')
      .getMany();
  }

  /** The scores of the depot's run on `date`, each with its order and outlet. */
  findPriorities(depotId: number, date: string): Promise<PriorityIndex[]> {
    return this.manager
      .getRepository(PriorityIndex)
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.order', 'order')
      .innerJoinAndSelect('order.outlet', 'outlet')
      .where('p.planDate = :date AND outlet.depotId = :depotId', {
        date,
        depotId,
      })
      .orderBy('p.score', 'DESC')
      .addOrderBy('order.id', 'ASC')
      .getMany();
  }

  /**
   * Swaps the depot's draft for `date` for a new one: its draft trips (their
   * stops go with them) and pending scores are dropped, then the new ones saved.
   */
  async replaceDraft(
    depotId: number,
    date: string,
    trips: DraftTrip[],
    priorities: Partial<PriorityIndex>[],
    manager: EntityManager,
  ): Promise<void> {
    await manager.delete(Trip, {
      depotId,
      serviceDate: date,
      status: TripStatus.DRAFT,
    });
    await manager.query(
      `DELETE FROM priority_index p USING orders o, outlets t
       WHERE p.order_id = o.id AND o.outlet_id = t.id
         AND t.depot_id = $1 AND p.plan_date = $2 AND p.status = $3`,
      [depotId, date, PriorityIndexStatus.PENDING],
    );

    for (const { stops, ...fields } of trips) {
      const trip = await manager.save(manager.create(Trip, fields));
      await manager.save(
        stops.map((stop) =>
          manager.create(TripStop, { ...stop, tripId: trip.id }),
        ),
      );
    }
    await manager.save(
      priorities.map((priority) => manager.create(PriorityIndex, priority)),
    );
  }

  /**
   * Makes the depot's draft for `date` the plan: its trips and the orders on
   * them become planned, the orders it leaves off are deferred to
   * `deferredToDate` with their reason on record, and its scores are accepted.
   */
  async publishDraft(
    depotId: number,
    date: string,
    deferredToDate: string | null,
    actorId: number,
    manager: EntityManager,
  ): Promise<void> {
    const trips = await manager.find(Trip, {
      where: { depotId, serviceDate: date, status: TripStatus.DRAFT },
      relations: { stops: true },
    });
    const planned = trips.flatMap((trip) =>
      (trip.stops ?? []).map((stop) => stop.orderId),
    );
    const priorities = (await this.findPriorities(depotId, date)).filter(
      (priority) => priority.status === PriorityIndexStatus.PENDING,
    );
    const deferred = priorities.filter((priority) => priority.deferralReason);

    if (trips.length) {
      await manager.update(
        Trip,
        { id: In(trips.map((trip) => trip.id)) },
        { status: TripStatus.PLANNED, updatedById: actorId },
      );
    }
    if (planned.length) {
      await manager.update(
        Order,
        { id: In(planned) },
        { status: OrderStatus.PLANNED, updatedById: actorId },
      );
    }
    if (deferred.length) {
      await manager.save(
        deferred.map((priority) =>
          manager.create(OrderDeferral, {
            orderId: priority.orderId,
            planDate: date,
            reason: priority.deferralReason!,
            reasonNote: priority.remark,
            deferredToDate,
            createdById: actorId,
            updatedById: actorId,
          }),
        ),
      );
      await manager.update(
        Order,
        { id: In(deferred.map((priority) => priority.orderId)) },
        { status: OrderStatus.DEFERRED, updatedById: actorId },
      );
    }
    if (priorities.length) {
      await manager.update(
        PriorityIndex,
        { id: In(priorities.map((priority) => priority.id)) },
        { status: PriorityIndexStatus.ACCEPTED, updatedById: actorId },
      );
    }
  }
}
