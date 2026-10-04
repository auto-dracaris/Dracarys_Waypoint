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
import { OrderDateQueryDto } from '../dto/order-date-query.dto';
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

  /** The vehicle and trip each order is on, once its plan is published. */
  async findAssignments(
    orderIds: number[],
  ): Promise<Map<number, { vehicle: string; tripNo: number }>> {
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
      .addSelect('trip.tripNo', 'tripNo')
      .where('stop.orderId IN (:...orderIds)', { orderIds })
      .andWhere('trip.status NOT IN (:...hidden)', {
        hidden: [TripStatus.DRAFT, TripStatus.CANCELLED],
      })
      .getRawMany<{ orderId: number; vehicle: string; tripNo: number }>();
    return new Map(
      rows.map((row) => [
        row.orderId,
        { vehicle: row.vehicle, tripNo: row.tripNo },
      ]),
    );
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
