import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  MoreThan,
  MoreThanOrEqual,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { orderIdFromReference } from '../../../common/utils/order.util';
import { Calendar } from '../../../database/entities/calendar.entity';
import { OrderDeferral } from '../../../database/entities/order-deferral.entity';
import { Order } from '../../../database/entities/order.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { TripStopStatus } from '../../../common/enums/trip-stop-status.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';
import { IssueStatus } from '../../../common/enums/issue-status.enum';
import { Issue } from '../../../database/entities/issue.entity';
import { OrderDateQueryDto } from '../dto/order-date-query.dto';
import {
  DeliveryStage,
  QueryMyDeliveryDto,
} from '../dto/query-my-delivery.dto';
import { QueryMyOrderDto } from '../dto/query-my-order.dto';
import {
  OrderSortKey,
  OrderStage,
  QueryOrderDto,
} from '../dto/query-order.dto';

/**
 * The run an order currently belongs to: where its latest deferral sent it,
 * or the day it was requested for if it was never deferred. `requested_date`
 * itself never moves, so demand stays counted against the day it was asked for.
 */
const RUN_DATE = `COALESCE(
  (SELECT MAX(d.deferred_to_date) FROM order_deferrals d WHERE d.order_id = o.id),
  o.requested_date
)`;

// Statuses of an order that is on a trip.
const ALLOCATED = [
  OrderStatus.PLANNED,
  OrderStatus.LOADED,
  OrderStatus.DISPATCHED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DOCKED,
];

/**
 * How orders are scoped and staged. With a `date` they are seen from that
 * run: the run holds the orders requested for it plus those deferred onto it,
 * a deferred order that reached it is awaiting planning again, and `deferred`
 * is every order that left it. Without one, every order is in scope and is
 * staged by its status alone.
 */
function stagesFor(date: string | undefined): {
  scope: string | null;
  filters: Record<OrderStage, string>;
} {
  if (!date) {
    return {
      scope: null,
      filters: {
        awaiting: 'o.status = :confirmed',
        allocated: 'o.status IN (:...allocated)',
        deferred: 'o.status = :deferred',
        delivered: 'o.status = :delivered',
        cancelled: 'o.status = :cancelled',
      },
    };
  }
  // The order was deferred off the run being looked at.
  const leftRun = `${RUN_DATE} <> :date`;
  return {
    scope: `(o.requestedDate = :date OR ${RUN_DATE} = :date)`,
    filters: {
      awaiting: `(o.status = :confirmed OR (o.status = :deferred AND NOT (${leftRun})))`,
      allocated: `(o.status IN (:...allocated) AND NOT (${leftRun}))`,
      deferred: leftRun,
      delivered: `(o.status = :delivered AND NOT (${leftRun}))`,
      cancelled: 'o.status = :cancelled',
    },
  };
}

const STAGE_PARAMETERS = {
  confirmed: OrderStatus.CONFIRMED,
  deferred: OrderStatus.DEFERRED,
  delivered: OrderStatus.DELIVERED,
  cancelled: OrderStatus.CANCELLED,
  allocated: ALLOCATED,
};

const SORT_COLUMNS: Record<OrderSortKey, string> = {
  id: 'o.id',
  outlet: 'outlet.uniqueId',
  tempRequirement: 'o.tempRequirement',
  requestedDate: 'o.requestedDate',
  orderWeightKg: 'o.orderWeightKg',
  orderVolumeM3: 'o.orderVolumeM3',
  status: 'o.status',
};

// Trips the loader, driver and store do not see yet, or will never see.
const HIDDEN_TRIPS = [TripStatus.DRAFT, TripStatus.CANCELLED];

export interface OrderAssignment {
  vehicle: string;
  vehicleType: VehicleType;
  tripNo: number;
  serviceDate: string;
  actualDepartAt: Date | null;
  plannedArrivalAt: Date;
  stopStatus: TripStopStatus;
  actualArrivalAt: Date | null;
  // When the driver recorded the drop, and how many cases they handed over.
  completedAt: Date | null;
  deliveredUnits: number | null;
  failureReason: string | null;
  receivedUnits: number | null;
  receiptConfirmedAt: Date | null;
}

// Each order's stop on its latest published trip; see `deliveriesOf`.
const LATEST_STOP = `trip.serviceDate = (
  SELECT MAX(t2.service_date) FROM trip_stops s2
  JOIN trips t2 ON t2.id = s2.trip_id
  WHERE s2.order_id = o.id AND t2.status NOT IN (:...hidden)
)`;

const DELIVERY_STAGE_FILTERS: Record<DeliveryStage, string> = {
  upcoming: 'stop.status IN (:...notHandedOver)',
  awaiting:
    'stop.status IN (:...handedOver) AND stop.receiptConfirmedAt IS NULL',
  completed: '(stop.receiptConfirmedAt IS NOT NULL OR stop.status = :failed)',
};

const DELIVERY_STAGE_PARAMETERS = {
  hidden: HIDDEN_TRIPS,
  notHandedOver: [
    TripStopStatus.PENDING,
    TripStopStatus.LOADED,
    TripStopStatus.ARRIVED,
  ],
  handedOver: [TripStopStatus.DELIVERED, TripStopStatus.PARTIAL],
  failed: TripStopStatus.FAILED,
};

export interface DeliveryCounts {
  all: number;
  upcoming: number;
  awaiting: number;
  completed: number;
  // Deliveries on trips that run on the day asked about.
  onDate: number;
}

export interface OrderSummary {
  total: number;
  awaiting: number;
  allocated: number;
  deferred: number;
  delivered: number;
  cancelled: number;
  // The load this run has to carry: awaiting and allocated orders.
  weightKg: number;
  volumeM3: number;
  chilledVolumeM3: number;
}

@Injectable()
export class OrdersRepository extends BaseRepository<Order> {
  constructor(
    @InjectRepository(Order)
    repository: Repository<Order>,
  ) {
    super(repository);
  }

  /**
   * Orders with their outlet, its district and depot, and the public columns
   * of whoever placed them — never the password hash.
   */
  private withOutlet(): SelectQueryBuilder<Order> {
    return this.repository
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.outlet', 'outlet')
      .leftJoinAndSelect('outlet.district', 'district')
      .leftJoinAndSelect('outlet.depot', 'depot')
      .leftJoin('o.placedBy', 'placedBy')
      .addSelect([
        'placedBy.id',
        'placedBy.firstName',
        'placedBy.lastName',
        'placedBy.phone',
      ]);
  }

  findDetail(orderId: number): Promise<Order | null> {
    return this.withOutlet().where('o.id = :orderId', { orderId }).getOne();
  }

  /** One outlet's orders, newest first. */
  findForOutlet(
    outletId: number,
    query: QueryMyOrderDto,
  ): Promise<[Order[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.withOutlet().where('o.outletId = :outletId', { outletId });

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.search?.trim()) {
      // An id that cannot be a reference matches nothing.
      qb.andWhere('o.id = :id', {
        id: orderIdFromReference(query.search) ?? 0,
      });
    }

    return qb
      .orderBy('o.placedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * The dispatcher's queue: every order, or with `query.date` one run's (see
   * `stagesFor`). Each row carries the run the order now belongs to.
   */
  async findQueue(
    query: QueryOrderDto,
  ): Promise<[{ order: Order; runDate: string }[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.withOutlet()
      .addSelect(`TO_CHAR(${RUN_DATE}, 'YYYY-MM-DD')`, 'run_date')
      .where('o.isActive = true')
      .setParameters({
        ...(query.date && { date: query.date }),
        ...STAGE_PARAMETERS,
      });
    const { scope, filters } = stagesFor(query.date);

    if (scope) {
      qb.andWhere(scope);
    }
    if (query.stage) {
      qb.andWhere(filters[query.stage]);
    }
    if (query.depot) {
      qb.andWhere('depot.name = :depot', { depot: query.depot });
    }
    if (query.brand) {
      qb.andWhere('outlet.brand = :brand', { brand: query.brand });
    }
    if (query.tempRequirement) {
      qb.andWhere('o.tempRequirement = :tempRequirement', {
        tempRequirement: query.tempRequirement,
      });
    }
    if (query.search?.trim()) {
      qb.andWhere(
        '(o.id = :id OR outlet.uniqueId ILIKE :term OR outlet.name ILIKE :term)',
        {
          id: orderIdFromReference(query.search) ?? 0,
          term: `%${query.search.trim()}%`,
        },
      );
    }

    // Across every day the latest delivery days come first; within one run
    // orders are in the order they were placed. `id` breaks ties so pages stay
    // stable under any sort. Every join is many-to-one, so a plain LIMIT keeps
    // one row per order and the raw `run_date` lines up with its entity.
    if (query.sortBy) {
      qb.orderBy(
        SORT_COLUMNS[query.sortBy],
        query.sortDir === 'desc' ? 'DESC' : 'ASC',
      );
    } else if (!query.date) {
      qb.orderBy('o.requestedDate', 'DESC');
    }
    qb.addOrderBy('o.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [{ entities, raw }, total] = await Promise.all([
      qb.getRawAndEntities<{ run_date: string }>(),
      qb.getCount(),
    ]);
    return [
      entities.map((order, i) => ({ order, runDate: raw[i].run_date })),
      total,
    ];
  }

  /** Every order awaiting planning on one depot's run, for the planning run. */
  findAwaiting(date: string, depot: string): Promise<Order[]> {
    const { scope, filters } = stagesFor(date);
    return this.withOutlet()
      .where(scope!)
      .andWhere(filters.awaiting)
      .andWhere('depot.name = :depot', { depot })
      .setParameters({ date, ...STAGE_PARAMETERS })
      .orderBy('o.id', 'ASC')
      .getMany();
  }

  /** The vehicle, trip and stop each order is on, once its plan is published. */
  async findAssignments(
    orderIds: number[],
  ): Promise<Map<number, OrderAssignment>> {
    if (!orderIds.length) {
      return new Map();
    }
    const rows = await this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder('stop')
      .innerJoin('stop.trip', 'trip')
      .innerJoin('trip.vehicle', 'vehicle')
      .select('stop.orderId', 'orderId')
      .addSelect('vehicle.uniqueId', 'vehicle')
      .addSelect('vehicle.type', 'vehicleType')
      .addSelect('trip.tripNo', 'tripNo')
      .addSelect("TO_CHAR(trip.serviceDate, 'YYYY-MM-DD')", 'serviceDate')
      .addSelect('trip.actualDepartAt', 'actualDepartAt')
      .addSelect('stop.plannedArrivalAt', 'plannedArrivalAt')
      .addSelect('stop.status', 'stopStatus')
      .addSelect('stop.actualArrivalAt', 'actualArrivalAt')
      .addSelect('stop.completedAt', 'completedAt')
      .addSelect('stop.deliveredUnits', 'deliveredUnits')
      .addSelect('stop.failureReason', 'failureReason')
      .addSelect('stop.receivedUnits', 'receivedUnits')
      .addSelect('stop.receiptConfirmedAt', 'receiptConfirmedAt')
      .where('stop.orderId IN (:...orderIds)', { orderIds })
      .andWhere('trip.status NOT IN (:...hidden)', { hidden: HIDDEN_TRIPS })
      // Ascending, so an order's latest trip is the one left in the map.
      .orderBy('trip.serviceDate', 'ASC')
      .getRawMany<{ orderId: number } & OrderAssignment>();
    return new Map(
      rows.map(({ orderId, ...assignment }) => [orderId, assignment]),
    );
  }

  /** The published trip stop delivering an order, with its trip's vehicle and depot. */
  findDeliveryStop(orderId: number): Promise<TripStop | null> {
    return this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder('stop')
      .innerJoinAndSelect('stop.trip', 'trip')
      .innerJoinAndSelect('trip.vehicle', 'vehicle')
      .innerJoinAndSelect('trip.depot', 'depot')
      .where('stop.orderId = :orderId', { orderId })
      .andWhere('trip.status NOT IN (:...hidden)', { hidden: HIDDEN_TRIPS })
      .orderBy('trip.serviceDate', 'DESC')
      .getOne();
  }

  /** Where a trip's stops are, in visiting order, up to and including `seq`. */
  async findStopPoints(
    tripId: string,
    seq: number,
  ): Promise<{ lat: number; lng: number }[]> {
    const rows = await this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder('stop')
      .innerJoin('stop.order', 'o')
      .innerJoin('o.outlet', 'outlet')
      .select('outlet.lat', 'lat')
      .addSelect('outlet.lng', 'lng')
      .where('stop.tripId = :tripId AND stop.seq <= :seq', { tripId, seq })
      .andWhere('outlet.lat IS NOT NULL AND outlet.lng IS NOT NULL')
      .orderBy('stop.seq', 'ASC')
      .getRawMany<{ lat: string; lng: string }>();
    return rows.map((row) => ({
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
    }));
  }

  /**
   * One outlet's orders on a published trip, each joined to its stop (`stop`)
   * and trip (`trip`) on the latest such trip, so there is one row per order.
   */
  private deliveriesOf(
    qb: SelectQueryBuilder<Order>,
    outletId: number,
  ): SelectQueryBuilder<Order> {
    return qb
      .innerJoin(TripStop, 'stop', 'stop.orderId = o.id')
      .innerJoin('stop.trip', 'trip')
      .where('o.outletId = :outletId', { outletId })
      .andWhere('trip.status NOT IN (:...hidden)')
      .andWhere(LATEST_STOP)
      .setParameters(DELIVERY_STAGE_PARAMETERS);
  }

  /** A page of one outlet's deliveries, latest delivery day first. */
  findDeliveriesFor(
    outletId: number,
    query: QueryMyDeliveryDto,
  ): Promise<[Order[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.deliveriesOf(this.withOutlet(), outletId);

    if (query.stage) {
      qb.andWhere(DELIVERY_STAGE_FILTERS[query.stage]);
    }
    if (query.date) {
      qb.andWhere('trip.serviceDate = :date', { date: query.date });
    }
    if (query.search?.trim()) {
      qb.andWhere('o.id = :id', {
        id: orderIdFromReference(query.search) ?? 0,
      });
    }

    // One row per order (see `deliveriesOf`), so a plain LIMIT pages orders.
    return qb
      .orderBy('trip.serviceDate', 'DESC')
      .addOrderBy('stop.plannedArrivalAt', 'ASC')
      .addOrderBy('o.id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();
  }

  /** How many of one outlet's deliveries are in each stage, and on `date`. */
  async countDeliveries(
    outletId: number,
    date: string,
  ): Promise<DeliveryCounts> {
    const row = (await this.deliveriesOf(
      this.repository.createQueryBuilder('o'),
      outletId,
    )
      .select('COUNT(*)', 'all')
      .addSelect(
        `COUNT(*) FILTER (WHERE ${DELIVERY_STAGE_FILTERS.upcoming})`,
        'upcoming',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${DELIVERY_STAGE_FILTERS.awaiting})`,
        'awaiting',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${DELIVERY_STAGE_FILTERS.completed})`,
        'completed',
      )
      .addSelect('COUNT(*) FILTER (WHERE trip.serviceDate = :date)', 'onDate')
      .setParameter('date', date)
      .getRawOne<Record<keyof DeliveryCounts, string>>())!;
    return {
      all: parseInt(row.all, 10),
      upcoming: parseInt(row.upcoming, 10),
      awaiting: parseInt(row.awaiting, 10),
      completed: parseInt(row.completed, 10),
      onDate: parseInt(row.onDate, 10),
    };
  }

  /** Issues someone reported that the dispatcher has not resolved yet. */
  countOpenIssuesBy(reporterId: number): Promise<number> {
    return this.repository.manager.getRepository(Issue).count({
      where: [
        { reportedById: reporterId, status: IssueStatus.OPEN, isActive: true },
        {
          reportedById: reporterId,
          status: IssueStatus.ACKNOWLEDGED,
          isActive: true,
        },
      ],
    });
  }

  /**
   * Records what the store accepted. Only the first confirmation counts;
   * false when the stop was already confirmed.
   */
  async confirmReceipt(
    stopId: string,
    receivedUnits: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder()
      .update()
      .set({
        receivedUnits,
        receiptConfirmedAt: () => 'now()',
        receiptConfirmedById: userId,
        updatedById: userId,
      })
      .where('id = :stopId AND receipt_confirmed_at IS NULL', { stopId })
      .execute();
    return result.affected === 1;
  }

  /** One outlet's orders on a published trip that runs on `date`. */
  findOnTripsFor(outletId: number, date: string): Promise<Order[]> {
    return this.withOutlet()
      .where('o.outletId = :outletId', { outletId })
      .andWhere(
        `EXISTS (SELECT 1 FROM trip_stops stop
                 JOIN trips trip ON trip.id = stop.trip_id
                 WHERE stop.order_id = o.id
                   AND trip.service_date = :date
                   AND trip.status NOT IN (:...hidden))`,
        { date, hidden: HIDDEN_TRIPS },
      )
      .getMany();
  }

  /** Handed-over deliveries to one outlet that the store has not yet confirmed. */
  countAwaitingReceipt(outletId: number): Promise<number> {
    return this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder('stop')
      .innerJoin('stop.order', 'o')
      .where('o.outletId = :outletId', { outletId })
      .andWhere('stop.status IN (:...handedOver)', {
        handedOver: [TripStopStatus.DELIVERED, TripStopStatus.PARTIAL],
      })
      .andWhere('stop.receiptConfirmedAt IS NULL')
      .getCount();
  }

  /** The status cards and the load to carry, for one run or for every order. */
  async summarise(query: OrderDateQueryDto): Promise<OrderSummary> {
    const { scope, filters } = stagesFor(query.date);
    const load = `(${filters.awaiting} OR ${filters.allocated})`;
    const qb = this.repository
      .createQueryBuilder('o')
      .select('COUNT(*) FILTER (WHERE o.status <> :cancelled)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE ${filters.awaiting})`, 'awaiting')
      .addSelect(`COUNT(*) FILTER (WHERE ${filters.allocated})`, 'allocated')
      .addSelect(`COUNT(*) FILTER (WHERE ${filters.deferred})`, 'deferred')
      .addSelect(`COUNT(*) FILTER (WHERE ${filters.delivered})`, 'delivered')
      .addSelect(`COUNT(*) FILTER (WHERE ${filters.cancelled})`, 'cancelled')
      .addSelect(
        `COALESCE(SUM(o.orderWeightKg) FILTER (WHERE ${load}), 0)`,
        'weightKg',
      )
      .addSelect(
        `COALESCE(SUM(o.orderVolumeM3) FILTER (WHERE ${load}), 0)`,
        'volumeM3',
      )
      .addSelect(
        `COALESCE(SUM(o.orderVolumeM3) FILTER (WHERE ${load} AND o.tempRequirement = :chilled), 0)`,
        'chilledVolumeM3',
      )
      .where('o.isActive = true')
      .setParameters({
        ...(query.date && { date: query.date }),
        chilled: TempRequirement.CHILLED,
        ...STAGE_PARAMETERS,
      });

    if (scope) {
      qb.andWhere(scope);
    }
    if (query.depot) {
      qb.innerJoin('o.outlet', 'outlet').innerJoin(
        'outlet.depot',
        'depot',
        'depot.name = :depot',
        { depot: query.depot },
      );
    }

    const row = (await qb.getRawOne<Record<keyof OrderSummary, string>>())!;
    return {
      total: parseInt(row.total, 10),
      awaiting: parseInt(row.awaiting, 10),
      allocated: parseInt(row.allocated, 10),
      deferred: parseInt(row.deferred, 10),
      delivered: parseInt(row.delivered, 10),
      cancelled: parseInt(row.cancelled, 10),
      weightKg: parseFloat(row.weightKg),
      volumeM3: parseFloat(row.volumeM3),
      chilledVolumeM3: parseFloat(row.chilledVolumeM3),
    };
  }

  /** Each order's most recent deferral, keyed by order id. */
  async findLatestDeferrals(
    orderIds: number[],
  ): Promise<Map<number, OrderDeferral>> {
    if (!orderIds.length) {
      return new Map();
    }
    const deferrals = await this.repository.manager
      .getRepository(OrderDeferral)
      .find({ where: { orderId: In(orderIds) }, order: { planDate: 'ASC' } });
    // Ascending, so the latest run's deferral is the one left in the map.
    return new Map(deferrals.map((deferral) => [deferral.orderId, deferral]));
  }

  saveDeferral(
    data: Partial<OrderDeferral>,
    manager: EntityManager,
  ): Promise<OrderDeferral> {
    return manager.save(manager.create(OrderDeferral, data));
  }

  findCalendarDay(date: string): Promise<Calendar | null> {
    return this.calendar().findOneBy({ date });
  }

  /** The next `limit` operating days from `from` on, earliest first. */
  async findOperatingDaysFrom(from: string, limit: number): Promise<string[]> {
    const days = await this.calendar().find({
      where: { isOperating: true, date: MoreThanOrEqual(from) },
      order: { date: 'ASC' },
      take: limit,
    });
    return days.map((day) => day.date);
  }

  async findNextOperatingDay(after: string): Promise<string | null> {
    const day = await this.calendar().findOne({
      where: { isOperating: true, date: MoreThan(after) },
      order: { date: 'ASC' },
    });
    return day?.date ?? null;
  }

  /**
   * For each date, the last operating day before it — the day its orders
   * close. A date with no operating day before it is left out.
   */
  async findPreviousOperatingDays(
    dates: string[],
  ): Promise<Map<string, string>> {
    if (!dates.length) {
      return new Map();
    }
    const rows: { date: string; previous: string | null }[] =
      await this.repository.manager.query(
        `SELECT TO_CHAR(c."date", 'YYYY-MM-DD') AS date,
                TO_CHAR((SELECT MAX(p."date") FROM calendar p
                         WHERE p.is_operating AND p."date" < c."date"), 'YYYY-MM-DD') AS previous
         FROM calendar c
         WHERE c."date" = ANY($1::date[])`,
        [dates],
      );
    return new Map(
      rows.flatMap((row) =>
        row.previous ? [[row.date, row.previous] as const] : [],
      ),
    );
  }

  private calendar(): Repository<Calendar> {
    return this.repository.manager.getRepository(Calendar);
  }
}
