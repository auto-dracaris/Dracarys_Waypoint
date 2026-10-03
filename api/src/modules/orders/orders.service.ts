import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Brand } from '../../common/enums/brand.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { TempRequirement } from '../../common/enums/temp-requirement.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { cutoffOn, today } from '../../common/utils/date.util';
import { orderReference } from '../../common/utils/order.util';
import { OrderDeferral } from '../../database/entities/order-deferral.entity';
import { Order } from '../../database/entities/order.entity';
import { Outlet } from '../../database/entities/outlet.entity';
import { OutletsRepository } from '../outlets/repositories/outlets.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeferOrderDto } from './dto/defer-order.dto';
import { OrderDateQueryDto } from './dto/order-date-query.dto';
import { QueryMyOrderDto } from './dto/query-my-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrdersRepository } from './repositories/orders.repository';

// Postgres's unique-violation code; see `uq_orders_outlet_date_temp`.
const UNIQUE_VIOLATION = '23505';

// How many open delivery days the order form offers.
const DELIVERY_DAYS_OFFERED = 6;

interface DeliveryDay {
  date: string;
  cutoffAt: Date;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly outletsRepository: OutletsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly dataSource: DataSource,
  ) {}

  /** What the order form needs: the caller's outlet and the days still open. */
  async placementOptions(userId: number): Promise<ApiResponseDto> {
    const outlet = await this.outletOfOrThrow(userId);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Placement options retrieved successfully',
      {
        outlet: this.toOutletView(outlet),
        deliveryDays: await this.openDeliveryDays(),
        tempRequirements: this.tempRequirementsFor(outlet),
      },
    );
  }

  /**
   * Places an order for the caller's outlet. It is saved as `ordered`, then
   * confirmed by the availability check, in the one request.
   */
  async create(dto: CreateOrderDto, userId: number): Promise<ApiResponseDto> {
    const outlet = await this.outletOfOrThrow(userId);

    const cutoffAt = await this.cutoffForOrThrow(dto.requestedDate);
    if (Date.now() >= cutoffAt.getTime()) {
      throw new BadRequestException(
        `Orders for ${dto.requestedDate} closed at 16:00 on the previous operating day`,
      );
    }
    if (!this.tempRequirementsFor(outlet).includes(dto.tempRequirement)) {
      throw new BadRequestException(
        `${outlet.brand} outlets cannot place ${dto.tempRequirement} orders`,
      );
    }

    const placedAt = new Date();
    let order: Order;
    try {
      order = await this.ordersRepository.save(
        this.ordersRepository.create({
          ...dto,
          outletId: outlet.id,
          placedById: userId,
          status: OrderStatus.ORDERED,
          placedAt,
          createdById: userId,
          updatedById: userId,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `This outlet already has ${dto.tempRequirement === TempRequirement.CHILLED ? 'a chilled' : 'an ambient'} order for ${dto.requestedDate}`,
        );
      }
      throw error;
    }

    if (await this.checkAvailability(order)) {
      order.status = OrderStatus.CONFIRMED;
      order.confirmedAt = new Date();
    } else {
      order.status = OrderStatus.CANCELLED;
    }
    await this.ordersRepository.save(order);

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Order placed successfully',
      await this.buildDetail(order.id),
    );
  }

  async findMine(
    query: QueryMyOrderDto,
    userId: number,
  ): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const outlet = await this.outletOfOrThrow(userId);
    const [orders, total] = await this.ordersRepository.findForOutlet(
      outlet.id,
      query,
    );

    return new ApiResponseDto(HttpStatus.OK, 'Orders retrieved successfully', {
      items: await this.toViews(orders),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  /** The dispatcher's queue; see `OrdersRepository.findQueue`. */
  async findAll(query: QueryOrderDto): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const date = query.date;
    const [rows, total] = await this.ordersRepository.findQueue(query);
    const views = await this.toViews(rows.map((row) => row.order));

    return new ApiResponseDto(HttpStatus.OK, 'Orders retrieved successfully', {
      items: views.map((view, i) => ({
        ...view,
        runDate: rows[i].runDate,
        // Both are relative to the run being looked at, so they are only set
        // when one is: requested for an earlier day and deferred onto this
        // run, or requested for this run and deferred off it.
        carriedOver:
          !!date && rows[i].runDate === date && view.requestedDate !== date,
        deferredAway: !!date && rows[i].runDate !== date,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async summary(query: OrderDateQueryDto): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Order summary retrieved successfully',
      await this.ordersRepository.summarise(query),
    );
  }

  /** A store manager sees only their own outlet's orders. */
  async findOne(
    orderId: number,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const outletId =
      user.role === UserRole.STORE_MANAGER
        ? (await this.outletOfOrThrow(user.userId)).id
        : undefined;

    return new ApiResponseDto(
      HttpStatus.OK,
      'Order retrieved successfully',
      await this.buildDetail(orderId, outletId),
    );
  }

  /** A store manager may withdraw a confirmed order until its day closes. */
  async cancel(orderId: number, userId: number): Promise<ApiResponseDto> {
    const outlet = await this.outletOfOrThrow(userId);
    const order = await this.findOrThrow(orderId, outlet.id);

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `An order that is ${order.status.replace(/_/g, ' ')} cannot be cancelled`,
      );
    }
    const cutoffAt = await this.cutoffForOrThrow(order.requestedDate);
    if (Date.now() >= cutoffAt.getTime()) {
      throw new BadRequestException(
        'Orders for this delivery day have closed, so it can no longer be cancelled',
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.updatedById = userId;
    await this.ordersRepository.save(order);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Order cancelled successfully',
      await this.buildDetail(orderId),
    );
  }

  /**
   * The dispatcher leaves a confirmed order off its run. It keeps its
   * requested date and joins the next operating day's run instead.
   * `actorId` is recorded as the deferral's `created_by`.
   */
  async defer(
    orderId: number,
    dto: DeferOrderDto,
    actorId: number,
  ): Promise<ApiResponseDto> {
    const order = await this.findOrThrow(orderId);
    // ponytail: only a confirmed order can be deferred here. Deferring one
    // already carried onto a later run again belongs to the allocation run.
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new ConflictException(
        order.status === OrderStatus.DEFERRED
          ? 'Order is already deferred'
          : `An order that is ${order.status.replace(/_/g, ' ')} cannot be deferred`,
      );
    }
    const deferredToDate = await this.ordersRepository.findNextOperatingDay(
      order.requestedDate,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.ordersRepository.saveDeferral(
        {
          orderId: order.id,
          planDate: order.requestedDate,
          reason: dto.reason,
          reasonNote: dto.reasonNote?.trim() || null,
          deferredToDate,
          createdById: actorId,
          updatedById: actorId,
        },
        queryRunner.manager,
      );
      order.status = OrderStatus.DEFERRED;
      order.updatedById = actorId;
      await this.ordersRepository.save(order, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        (error as Error).message || 'Could not defer the order',
      );
    } finally {
      await queryRunner.release();
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Order deferred successfully',
      await this.buildDetail(orderId),
    );
  }

  /**
   * The workflow's "are the items available" step, which is what confirms an
   * order.
   * ponytail: there is no inventory service yet, so every order is available.
   * Call it here once it exists; an order that fails is cancelled by `create`.
   */
  private checkAvailability(_order: Order): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** Only Fresh sells chilled goods; they are ordered separately from ambient. */
  private tempRequirementsFor(outlet: Outlet): TempRequirement[] {
    return outlet.brand === Brand.FRESH
      ? [TempRequirement.AMBIENT, TempRequirement.CHILLED]
      : [TempRequirement.AMBIENT];
  }

  /**
   * Delivery days that can still be ordered for. A day closes at 16:00 on the
   * operating day before it, so each day is paired with its predecessor.
   */
  private async openDeliveryDays(): Promise<DeliveryDay[]> {
    const days = await this.ordersRepository.findOperatingDaysFrom(
      today(),
      DELIVERY_DAYS_OFFERED + 2,
    );
    const previous =
      await this.ordersRepository.findPreviousOperatingDays(days);
    const now = Date.now();

    return days
      .flatMap((date) => {
        const closesOn = previous.get(date);
        return closesOn ? [{ date, cutoffAt: cutoffOn(closesOn) }] : [];
      })
      .filter((day) => now < day.cutoffAt.getTime())
      .slice(0, DELIVERY_DAYS_OFFERED);
  }

  private async cutoffForOrThrow(date: string): Promise<Date> {
    const day = await this.ordersRepository.findCalendarDay(date);
    if (!day?.isOperating) {
      throw new BadRequestException(`${date} is not a delivery day`);
    }
    const closesOn = (
      await this.ordersRepository.findPreviousOperatingDays([date])
    ).get(date);
    if (!closesOn) {
      throw new BadRequestException(`${date} is not a delivery day`);
    }
    return cutoffOn(closesOn);
  }

  /** The outlet a store manager orders for. */
  private async outletOfOrThrow(userId: number): Promise<Outlet> {
    const user = await this.usersRepository.findById(userId);
    const outlet = user?.outletId
      ? await this.outletsRepository.findByOutletId(user.outletId)
      : null;
    if (!outlet) {
      throw new BadRequestException(
        'Your account is not linked to an outlet. Ask a dispatcher to assign one.',
      );
    }
    return outlet;
  }

  /** `outletId` narrows the lookup to one outlet, so another outlet's order reads as missing. */
  private async findOrThrow(
    orderId: number,
    outletId?: number,
  ): Promise<Order> {
    const order = await this.ordersRepository.findDetail(orderId);
    if (!order || (outletId !== undefined && order.outletId !== outletId)) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }
    return order;
  }

  private async buildDetail(orderId: number, outletId?: number) {
    const [view] = await this.toViews([
      await this.findOrThrow(orderId, outletId),
    ]);
    return view;
  }

  /** Response shape for orders, each with its latest deferral and its cutoff. */
  private async toViews(orders: Order[]) {
    const orderIds = orders.map((o) => o.id);
    const [deferrals, assignments, closingDays] = await Promise.all([
      this.ordersRepository.findLatestDeferrals(orderIds),
      this.ordersRepository.findAssignments(orderIds),
      this.ordersRepository.findPreviousOperatingDays([
        ...new Set(orders.map((o) => o.requestedDate)),
      ]),
    ]);
    const now = Date.now();

    return orders.map((order) => {
      const closesOn = closingDays.get(order.requestedDate);
      const cutoffAt = closesOn ? cutoffOn(closesOn) : null;
      const { outlet, placedBy, ...fields } = order;
      return {
        ...fields,
        reference: orderReference(order.id),
        cutoffAt,
        cancellable:
          order.status === OrderStatus.CONFIRMED &&
          !!cutoffAt &&
          now < cutoffAt.getTime(),
        outlet: outlet ? this.toOutletView(outlet) : null,
        placedBy: placedBy ?? null,
        deferral: this.toDeferralView(deferrals.get(order.id)),
        // The vehicle and trip carrying it, once its plan is published.
        assignment: assignments.get(order.id) ?? null,
      };
    });
  }

  private toOutletView(outlet: Outlet) {
    return {
      id: outlet.id,
      uniqueId: outlet.uniqueId,
      name: outlet.name,
      brand: outlet.brand,
      district: outlet.district?.name ?? null,
      depot: outlet.depot?.name ?? null,
      dockType: outlet.dockType,
      parkingConstraint: outlet.parkingConstraint,
      windowOpenTime: outlet.windowOpenTime,
      windowCloseTime: outlet.windowCloseTime,
      mallWindowOpen: outlet.mallWindowOpen,
      mallWindowClose: outlet.mallWindowClose,
    };
  }

  private toDeferralView(deferral: OrderDeferral | undefined) {
    return deferral
      ? {
          reason: deferral.reason,
          reasonNote: deferral.reasonNote,
          planDate: deferral.planDate,
          deferredToDate: deferral.deferredToDate,
          deferredAt: deferral.createdAt,
        }
      : null;
  }
}
