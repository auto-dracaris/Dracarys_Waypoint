import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { ParkingConstraint } from '../../../common/enums/parking-constraint.enum';
import { TempRequirement } from '../../../common/enums/temp-requirement.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { District } from '../../../database/entities/district.entity';
import { OrderDeferral } from '../../../database/entities/order-deferral.entity';
import { Order } from '../../../database/entities/order.entity';
import { Outlet } from '../../../database/entities/outlet.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
import { OutletSortKey, QueryOutletDto } from '../dto/query-outlet.dto';

// Ids are numeric, so responses carry the related rows for their names.
const OUTLET_RELATIONS: FindOptionsRelations<Outlet> = {
  district: true,
  depot: true,
};

const SORT_COLUMNS: Record<OutletSortKey, string> = {
  uniqueId: 'outlet.uniqueId',
  name: 'outlet.name',
  brand: 'outlet.brand',
  district: 'district.name',
  windowOpenTime: 'outlet.windowOpenTime',
  parkingConstraint: 'outlet.parkingConstraint',
};

// Orders that still have a delivery ahead of them.
const OPEN_ORDER = [
  OrderStatus.ORDERED,
  OrderStatus.CONFIRMED,
  OrderStatus.PLANNED,
  OrderStatus.DEFERRED,
  OrderStatus.LOADED,
  OrderStatus.DISPATCHED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DOCKED,
];

export interface OutletSummary {
  total: number;
  available: number;
  unavailable: number;
  vanOnly: number;
  mallDock: number;
  confirmedOrders: number;
}

export interface OutletNextDelivery {
  date: string;
  orders: number;
  temps: TempRequirement[];
}

export interface OutletActivity {
  type: 'received' | 'deferred';
  at: Date;
  note: string | null;
}

@Injectable()
export class OutletsRepository extends BaseRepository<Outlet> {
  constructor(
    @InjectRepository(Outlet)
    repository: Repository<Outlet>,
  ) {
    super(repository);
  }

  findByOutletId(outletId: number): Promise<Outlet | null> {
    return this.repository.findOne({
      where: { id: outletId, isActive: true },
      relations: OUTLET_RELATIONS,
    });
  }

  findDistrictByName(name: string): Promise<District | null> {
    return this.repository.manager.getRepository(District).findOneBy({ name });
  }

  /** Every district with its depot, for the depot and district pickers. */
  findDistricts(): Promise<District[]> {
    return this.repository.manager.getRepository(District).find({
      relations: { depot: true },
      order: { name: 'ASC' },
    });
  }

  findWithFilters(query: QueryOutletDto): Promise<[Outlet[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.repository
      .createQueryBuilder('outlet')
      .leftJoinAndSelect('outlet.district', 'district')
      .leftJoinAndSelect('outlet.depot', 'depot')
      .where('outlet.isActive = true');

    if (query.uniqueId) {
      qb.andWhere('outlet.uniqueId = :uniqueId', { uniqueId: query.uniqueId });
    }
    if (query.search?.trim()) {
      qb.andWhere(
        `(outlet.uniqueId ILIKE :term OR outlet.name ILIKE :term
          OR district.name ILIKE :term OR depot.name ILIKE :term)`,
        { term: `%${query.search.trim()}%` },
      );
    }
    if (query.brand) {
      qb.andWhere('outlet.brand = :brand', { brand: query.brand });
    }
    if (query.district) {
      qb.andWhere('district.name = :district', { district: query.district });
    }
    if (query.depot) {
      qb.andWhere('depot.name = :depot', { depot: query.depot });
    }
    if (query.dockType) {
      qb.andWhere('outlet.dockType = :dockType', { dockType: query.dockType });
    }
    if (query.parkingConstraint) {
      qb.andWhere('outlet.parkingConstraint = :parkingConstraint', {
        parkingConstraint: query.parkingConstraint,
      });
    }
    if (query.isAvailable !== undefined) {
      qb.andWhere('outlet.isAvailable = :isAvailable', {
        isAvailable: query.isAvailable,
      });
    }

    // `id` breaks ties so pages stay stable under any sort.
    return qb
      .orderBy(
        SORT_COLUMNS[query.sortBy ?? 'uniqueId'],
        query.sortDir === 'desc' ? 'DESC' : 'ASC',
      )
      .addOrderBy('outlet.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /** The metric tiles: outlet counts, plus confirmed orders due from `fromDate` on. */
  async summarise(fromDate: string): Promise<OutletSummary> {
    const row = (await this.repository
      .createQueryBuilder('outlet')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE outlet.isAvailable)', 'available')
      .addSelect(
        'COUNT(*) FILTER (WHERE NOT outlet.isAvailable)',
        'unavailable',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE outlet.parkingConstraint = :vanOnly)',
        'vanOnly',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE outlet.parkingConstraint = :mallDock)',
        'mallDock',
      )
      .where('outlet.isActive = true')
      .setParameters({
        vanOnly: ParkingConstraint.VAN_ONLY,
        mallDock: ParkingConstraint.MALL_DOCK,
      })
      .getRawOne<
        Record<Exclude<keyof OutletSummary, 'confirmedOrders'>, string>
      >())!;

    const confirmedOrders = await this.repository.manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .where('o.status = :status AND o.requestedDate >= :fromDate', {
        status: OrderStatus.CONFIRMED,
        fromDate,
      })
      .getCount();

    return {
      total: parseInt(row.total, 10),
      available: parseInt(row.available, 10),
      unavailable: parseInt(row.unavailable, 10),
      vanOnly: parseInt(row.vanOnly, 10),
      mallDock: parseInt(row.mallDock, 10),
      confirmedOrders,
    };
  }

  /** The earliest delivery day from `fromDate` on that still has open orders. */
  async findNextDelivery(
    outletId: number,
    fromDate: string,
  ): Promise<OutletNextDelivery | null> {
    const rows = await this.repository.manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .select("TO_CHAR(o.requestedDate, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('ARRAY_AGG(DISTINCT o.tempRequirement)', 'temps')
      .where('o.outletId = :outletId AND o.requestedDate >= :fromDate', {
        outletId,
        fromDate,
      })
      .andWhere('o.status IN (:...open)', { open: OPEN_ORDER })
      .groupBy('o.requestedDate')
      .orderBy('o.requestedDate', 'ASC')
      .limit(1)
      .getRawMany<{ date: string; orders: string; temps: TempRequirement[] }>();

    return rows[0]
      ? {
          date: rows[0].date,
          orders: parseInt(rows[0].orders, 10),
          temps: rows[0].temps,
        }
      : null;
  }

  /** Receipts the store confirmed and deferrals of the outlet's orders, newest first. */
  async findRecentActivity(
    outletId: number,
    limit: number,
  ): Promise<OutletActivity[]> {
    const manager = this.repository.manager;
    const [stops, deferrals] = await Promise.all([
      manager
        .getRepository(TripStop)
        .createQueryBuilder('stop')
        .innerJoin('stop.order', 'o')
        .where('o.outletId = :outletId', { outletId })
        .andWhere('stop.receiptConfirmedAt IS NOT NULL')
        .orderBy('stop.receiptConfirmedAt', 'DESC')
        .take(limit)
        .getMany(),
      manager
        .getRepository(OrderDeferral)
        .createQueryBuilder('d')
        .innerJoin('d.order', 'o')
        .where('o.outletId = :outletId', { outletId })
        .orderBy('d.createdAt', 'DESC')
        .take(limit)
        .getMany(),
    ]);

    return [
      ...stops.map((stop) => ({
        type: 'received' as const,
        at: stop.receiptConfirmedAt!,
        note: null,
      })),
      ...deferrals.map((deferral) => ({
        type: 'deferred' as const,
        at: deferral.createdAt,
        note: deferral.reasonNote ?? deferral.reason.replace(/_/g, ' '),
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
  }
}
