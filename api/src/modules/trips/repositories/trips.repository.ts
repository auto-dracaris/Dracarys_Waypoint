import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { IssueType } from '../../../common/enums/issue-type.enum';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Issue } from '../../../database/entities/issue.entity';
import { Order } from '../../../database/entities/order.entity';
import { RouteChange } from '../../../database/entities/route-change.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
import { Trip } from '../../../database/entities/trip.entity';
import { TripListQueryDto } from '../dto/trip-list-query.dto';

// A draft is still the planner's proposal and a cancelled trip is gone;
// neither is shown to the people who carry trips out.
const HIDDEN = [TripStatus.DRAFT, TripStatus.CANCELLED];

/** Whose trips to list: a driver's own, or a depot's. */
export type TripScope = { driverId: number } | { depotId: number };

@Injectable()
export class TripsRepository extends BaseRepository<Trip> {
  constructor(
    @InjectRepository(Trip)
    repository: Repository<Trip>,
  ) {
    super(repository);
  }

  /**
   * A trip with its vehicle, district, depot and its stop rows in unloading
   * order, each with the order and outlet it serves.
   */
  private detailed(): SelectQueryBuilder<Trip> {
    return this.repository
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.vehicle', 'vehicle')
      .innerJoinAndSelect('trip.district', 'district')
      .innerJoinAndSelect('trip.depot', 'depot')
      .leftJoinAndSelect('trip.stops', 'stop')
      .leftJoinAndSelect('stop.order', 'order')
      .leftJoinAndSelect('order.outlet', 'outlet')
      .orderBy('trip.plannedDepartAt', 'ASC')
      .addOrderBy('trip.tripNo', 'ASC')
      .addOrderBy('stop.seq', 'ASC');
  }

  findDetail(tripId: string): Promise<Trip | null> {
    return this.detailed().where('trip.id = :tripId', { tripId }).getOne();
  }

  /**
   * One page of a day's live trips. A trip is a driver's if it names them, or
   * names nobody yet and they are on its vehicle. The page is picked first and
   * its trips loaded in full after, since joining the stops would multiply rows.
   */
  async findForDay(
    scope: TripScope,
    date: string,
    query: TripListQueryDto,
  ): Promise<[Trip[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.repository
      .createQueryBuilder('trip')
      .innerJoin('trip.vehicle', 'vehicle')
      .select('trip.id', 'id')
      .where('trip.serviceDate = :date', { date })
      .andWhere('trip.status NOT IN (:...hidden)', { hidden: HIDDEN });

    if ('driverId' in scope) {
      qb.andWhere(
        new Brackets((owner) =>
          owner
            .where('trip.driverId = :driverId')
            .orWhere('trip.driverId IS NULL AND vehicle.driverId = :driverId'),
        ),
        { driverId: scope.driverId },
      );
    } else {
      qb.andWhere('trip.depotId = :depotId', { depotId: scope.depotId });
    }
    if (query.updatedSince) {
      qb.andWhere('trip.updatedAt > :since', { since: query.updatedSince });
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('trip.plannedDepartAt', 'ASC')
      .addOrderBy('trip.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string }>();
    if (!rows.length) {
      return [[], total];
    }
    const trips = await this.detailed()
      .where('trip.id IN (:...ids)', { ids: rows.map((row) => row.id) })
      .getMany();
    return [trips, total];
  }

  /** The latest load shortfall reported for the trip, with its order and outlet. */
  findShortfall(tripId: string): Promise<Issue | null> {
    return this.repository.manager.getRepository(Issue).findOne({
      where: { tripId, type: IssueType.LOAD_SHORTFALL },
      relations: { order: { outlet: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // Trips and stop rows are loaded with their relations, so they are changed
  // by id rather than saved back whole.
  async updateTrip(
    tripId: string,
    changes: Partial<Trip>,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(Trip, { id: tripId }, changes);
  }

  async updateStops(
    stopIds: string[],
    changes: Partial<TripStop>,
    manager: EntityManager,
  ): Promise<void> {
    if (stopIds.length) {
      await manager.update(TripStop, { id: In(stopIds) }, changes);
    }
  }

  async setOrderStatus(
    orderIds: number[],
    status: OrderStatus,
    actorId: number,
    manager: EntityManager,
  ): Promise<void> {
    if (orderIds.length) {
      await manager.update(
        Order,
        { id: In(orderIds) },
        { status, updatedById: actorId },
      );
    }
  }

  saveIssue(data: Partial<Issue>, manager: EntityManager): Promise<Issue> {
    return manager.save(manager.create(Issue, data));
  }

  saveRouteChange(
    data: Partial<RouteChange>,
    manager: EntityManager,
  ): Promise<RouteChange> {
    return manager.save(manager.create(RouteChange, data));
  }

  /** The newest reorder of the trip, optionally only if the driver has not seen it. */
  findLatestRouteChange(
    tripId: string,
    onlyUnacknowledged: boolean,
  ): Promise<RouteChange | null> {
    return this.repository.manager.getRepository(RouteChange).findOne({
      where: {
        tripId,
        ...(onlyUnacknowledged && { acknowledgedAt: IsNull() }),
      },
      order: { planVersion: 'DESC' },
    });
  }

  /** Marks every reorder of the trip the driver has not yet seen as seen. */
  async acknowledgeRouteChanges(
    tripId: string,
    driverId: number,
  ): Promise<void> {
    await this.repository.manager
      .getRepository(RouteChange)
      .update(
        { tripId, acknowledgedAt: IsNull() },
        { acknowledgedAt: new Date(), acknowledgedById: driverId },
      );
  }
}
