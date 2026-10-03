import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { IssueType } from '../../common/enums/issue-type.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { TempRequirement } from '../../common/enums/temp-requirement.enum';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { TripStopStatus } from '../../common/enums/trip-stop-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { minuteOfDay, toMinutes, today } from '../../common/utils/date.util';
import {
  orderIdFromReference,
  orderReference,
} from '../../common/utils/order.util';
import { DOCK_LABELS, deliveryWindow } from '../../common/utils/outlet.util';
import { vehicleLabel } from '../../common/utils/vehicle.util';
import { Outlet } from '../../database/entities/outlet.entity';
import {
  RouteChange,
  RouteChangeStop,
} from '../../database/entities/route-change.entity';
import { TripStop } from '../../database/entities/trip-stop.entity';
import { Trip } from '../../database/entities/trip.entity';
import { UsersRepository } from '../users/repositories/users.repository';
import { CompleteLoadingDto } from './dto/complete-loading.dto';
import {
  ArriveStopDto,
  CompleteStopDto,
  StartTripDto,
} from './dto/driver-action.dto';
import { ResequenceStopsDto } from './dto/resequence-stops.dto';
import { TripListQueryDto } from './dto/trip-list-query.dto';
import { TripsRepository } from './repositories/trips.repository';

// The driver app's names for a trip's stages.
const TRIP_STATUS: Record<TripStatus, string> = {
  [TripStatus.DRAFT]: 'draft',
  [TripStatus.PLANNED]: 'assigned',
  [TripStatus.LOADING]: 'loading',
  [TripStatus.LOADED]: 'ready',
  [TripStatus.DISPATCHED]: 'in_progress',
  [TripStatus.COMPLETED]: 'completed',
  [TripStatus.CANCELLED]: 'cancelled',
};

// The outcomes a driver records at a stop.
const RECORDED = new Set([
  TripStopStatus.DELIVERED,
  TripStopStatus.PARTIAL,
  TripStopStatus.FAILED,
]);

// A stop is reached with less than this left on its window: worth a warning.
const TIGHT_WINDOW_MIN = 30;

type StopState = 'pending' | 'arrived' | 'completed';

/**
 * A stop as the driver sees it: every order the trip carries to one outlet.
 * The database keeps one row per order, so the rows are grouped.
 */
interface Stop {
  outletId: number;
  outlet: Outlet;
  rows: TripStop[];
  state: StopState;
}

export const outletName = (outlet: Outlet): string =>
  outlet.name ?? `Waypoint ${outlet.brand} — ${outlet.uniqueId}`;

/** A trip's stops, in the order the vehicle visits them. */
export function stopsOf(trip: Trip): Stop[] {
  const stops = new Map<number, Stop>();
  for (const row of trip.stops ?? []) {
    const outlet = row.order!.outlet!;
    const stop = stops.get(outlet.id) ?? {
      outletId: outlet.id,
      outlet,
      rows: [],
      state: 'pending' as StopState,
    };
    stop.rows.push(row);
    stops.set(outlet.id, stop);
  }
  for (const stop of stops.values()) {
    const recorded = stop.rows.filter((row) => RECORDED.has(row.status));
    stop.state =
      recorded.length === stop.rows.length
        ? 'completed'
        : recorded.length ||
            stop.rows.some((row) => row.status === TripStopStatus.ARRIVED)
          ? 'arrived'
          : 'pending';
  }
  return [...stops.values()];
}

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly dataSource: DataSource,
  ) {}

  /** A driver's own trips for the day, or for a loader their depot's. */
  async findAll(
    query: TripListQueryDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const scope =
      user.role === UserRole.DRIVER
        ? { driverId: user.userId }
        : {
            depotId: (await this.usersRepository.findById(user.userId))!
              .depotId,
          };
    const [trips, total] = await this.tripsRepository.findForDay(
      scope,
      query.date ?? today(),
      query,
    );

    return new ApiResponseDto(HttpStatus.OK, 'Trips retrieved successfully', {
      items: trips.map((trip) => this.toSummary(trip)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async findOne(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Trip retrieved successfully',
      await this.toView(await this.loadFor(tripId, user)),
    );
  }

  /** The loader begins putting the trip's orders on the vehicle. */
  async startLoading(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    if (trip.status === TripStatus.PLANNED) {
      await this.inTransaction((manager) =>
        this.tripsRepository.updateTrip(
          trip.id,
          { status: TripStatus.LOADING, updatedById: user.userId },
          manager,
        ),
      );
    } else if (
      trip.status !== TripStatus.LOADING &&
      trip.status !== TripStatus.LOADED
    ) {
      throw await this.conflict(
        'Loading can only start on a planned trip',
        trip,
      );
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Loading started',
      await this.viewOf(tripId),
    );
  }

  /**
   * The vehicle is loaded and the trip is ready for its driver. An order that
   * went on short is put on record as a load shortfall for the dispatcher.
   */
  async completeLoading(
    tripId: string,
    dto: CompleteLoadingDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    // Marking a trip loaded twice changes nothing the second time.
    if (trip.status !== TripStatus.LOADED) {
      if (
        trip.status !== TripStatus.PLANNED &&
        trip.status !== TripStatus.LOADING
      ) {
        throw await this.conflict(
          'Only a planned or loading trip can be marked loaded',
          trip,
        );
      }
      const rows = trip.stops ?? [];
      const short =
        dto.shortfall && this.rowOfOrder(rows, dto.shortfall.orderId);
      if (
        dto.shortfall &&
        short!.order!.orderUnits < dto.shortfall.shortCases
      ) {
        throw new BadRequestException(
          `${dto.shortfall.orderId} has only ${short!.order!.orderUnits} cases`,
        );
      }

      await this.inTransaction(async (manager) => {
        await this.tripsRepository.updateTrip(
          trip.id,
          { status: TripStatus.LOADED, updatedById: user.userId },
          manager,
        );
        await this.tripsRepository.updateStops(
          rows.map((row) => row.id),
          { status: TripStopStatus.LOADED, updatedById: user.userId },
          manager,
        );
        await this.tripsRepository.setOrderStatus(
          rows.map((row) => row.orderId),
          OrderStatus.LOADED,
          user.userId,
          manager,
        );
        if (dto.shortfall && short) {
          await this.tripsRepository.saveIssue(
            {
              type: IssueType.LOAD_SHORTFALL,
              reportedById: user.userId,
              tripId: trip.id,
              tripStopId: short.id,
              orderId: short.orderId,
              vehicleId: trip.vehicleId,
              affectedUnits: dto.shortfall.shortCases,
              description:
                dto.shortfall.dispatcherNote?.trim() ||
                `${dto.shortfall.shortCases} cases short at loading`,
              recordedAt: new Date(),
              createdById: user.userId,
              updatedById: user.userId,
            },
            manager,
          );
        }
      });
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Trip loaded and ready',
      await this.viewOf(tripId),
    );
  }

  /** The driver leaves the depot. */
  async start(
    tripId: string,
    dto: StartTripDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    // A start that already happened (a retry from the handset) is answered
    // with the trip as it stands.
    if (
      trip.status !== TripStatus.DISPATCHED &&
      trip.status !== TripStatus.COMPLETED
    ) {
      if (trip.status !== TripStatus.LOADED) {
        throw await this.conflict(
          'The trip can only start once it is loaded and ready',
          trip,
        );
      }
      await this.inTransaction(async (manager) => {
        await this.tripsRepository.updateTrip(
          trip.id,
          {
            status: TripStatus.DISPATCHED,
            actualDepartAt: new Date(dto.startedAt),
            // Whoever drives it is who drove it, whatever the vehicle's
            // assignment becomes later.
            driverId: user.userId,
            updatedById: user.userId,
          },
          manager,
        );
        await this.tripsRepository.setOrderStatus(
          (trip.stops ?? []).map((row) => row.orderId),
          OrderStatus.DISPATCHED,
          user.userId,
          manager,
        );
      });
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Trip started',
      await this.viewOf(tripId),
    );
  }

  /** The driver reaches an outlet. `stopId` is the outlet's id. */
  async arrive(
    tripId: string,
    stopId: number,
    dto: ArriveStopDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    const { stop, earlier } = await this.stopForAction(
      trip,
      stopId,
      dto.planVersion,
    );

    if (stop.state === 'pending') {
      const waiting = earlier.find((before) => before.state !== 'completed');
      if (waiting) {
        throw await this.conflict(
          `Complete the stop at ${outletName(waiting.outlet)} first`,
          trip,
        );
      }
      await this.inTransaction(async (manager) => {
        await this.tripsRepository.updateStops(
          stop.rows.map((row) => row.id),
          {
            status: TripStopStatus.ARRIVED,
            actualArrivalAt: new Date(dto.arrivedAt),
            recordedAt: new Date(dto.arrivedAt),
            syncedAt: new Date(),
            updatedById: user.userId,
          },
          manager,
        );
        await this.tripsRepository.setOrderStatus(
          stop.rows.map((row) => row.orderId),
          OrderStatus.DOCKED,
          user.userId,
          manager,
        );
        await this.tripsRepository.updateTrip(
          trip.id,
          { updatedById: user.userId },
          manager,
        );
      });
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Arrival recorded',
      await this.viewOf(tripId),
    );
  }

  /**
   * The driver records what was handed over at an outlet, per order. The last
   * stop completes the trip.
   */
  async complete(
    tripId: string,
    stopId: number,
    dto: CompleteStopDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    const { stop, others } = await this.stopForAction(
      trip,
      stopId,
      dto.planVersion,
    );

    if (stop.state === 'pending') {
      throw await this.conflict('Record the arrival at this stop first', trip);
    }
    if (stop.state === 'arrived') {
      const delivered = this.deliveredPerRow(stop, dto.deliveredCases);
      const completedAt = new Date(dto.completedAt);
      const last = others.every((other) => other.state === 'completed');

      await this.inTransaction(async (manager) => {
        for (const [row, units] of delivered) {
          const total = row.order!.orderUnits;
          await this.tripsRepository.updateStops(
            [row.id],
            {
              status:
                units === total
                  ? TripStopStatus.DELIVERED
                  : units > 0
                    ? TripStopStatus.PARTIAL
                    : TripStopStatus.FAILED,
              deliveredUnits: units,
              failureReason: units > 0 ? null : 'Nothing was delivered',
              completedAt,
              recordedAt: completedAt,
              syncedAt: new Date(),
              updatedById: user.userId,
            },
            manager,
          );
        }
        const handedOver = [...delivered].filter(([, units]) => units > 0);
        const refused = [...delivered].filter(([, units]) => units === 0);
        await this.tripsRepository.setOrderStatus(
          handedOver.map(([row]) => row.orderId),
          OrderStatus.DELIVERED,
          user.userId,
          manager,
        );
        await this.tripsRepository.setOrderStatus(
          refused.map(([row]) => row.orderId),
          OrderStatus.FAILED,
          user.userId,
          manager,
        );
        await this.tripsRepository.updateTrip(
          trip.id,
          last
            ? {
                status: TripStatus.COMPLETED,
                completedAt,
                updatedById: user.userId,
              }
            : { updatedById: user.userId },
          manager,
        );
      });
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Stop completed',
      await this.viewOf(tripId),
    );
  }

  /**
   * The dispatcher changes the order of the stops the vehicle has not reached
   * yet. Their planned arrivals are worked out again, the trip's plan version
   * goes up, and the change is kept for the driver to review.
   */
  async resequence(
    tripId: string,
    dto: ResequenceStopsDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const trip = await this.loadFor(tripId, user);
    if (
      trip.status === TripStatus.DRAFT ||
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      throw await this.conflict(
        'Stops can only be reordered on a published trip that is not finished',
        trip,
      );
    }

    const before = stopsOf(trip);
    const fixed = before.filter((stop) => stop.state !== 'pending');
    const pending = before.filter((stop) => stop.state === 'pending');
    const reordered = dto.stopIds.map((id) =>
      pending.find((stop) => stop.outletId === id),
    );
    if (
      reordered.length !== pending.length ||
      reordered.some((stop) => !stop)
    ) {
      throw new BadRequestException(
        'stopIds must list every stop not yet arrived at, once each',
      );
    }
    const after = [...fixed, ...(reordered as Stop[])];
    if (after.every((stop, i) => stop === before[i])) {
      throw new BadRequestException('The stops are already in that order');
    }

    // Each order is its own stop row; a row is reached one inter-stop leg
    // after the row before it is done, the first after the outbound leg.
    const travel = trip.district!;
    const firstArrival = (stop: Stop) => stop.rows[0].plannedArrivalAt;
    const arrivedBefore = new Map(
      before.map((stop) => [stop.outletId, firstArrival(stop)]),
    );
    const moved = new Set(pending.flatMap((stop) => stop.rows));
    let previous: TripStop | undefined;
    const rows = after.flatMap((stop) => stop.rows);
    for (const row of rows) {
      if (moved.has(row)) {
        const arrival = previous
          ? previous.plannedArrivalAt.getTime() +
            (previous.plannedWaitMin +
              previous.plannedServiceMin +
              travel.interStopFreeflowMin) *
              60_000
          : trip.plannedDepartAt.getTime() +
            travel.depotToDistrictFreeflowMin * 60_000;
        row.plannedArrivalAt = new Date(arrival);
        row.plannedWaitMin = Math.max(
          0,
          toMinutes(deliveryWindow(row.order!.outlet!).windowOpen) -
            minuteOfDay(row.plannedArrivalAt),
        );
      }
      previous = row;
    }

    const impact = (reordered as Stop[]).reduce((most, stop) =>
      Math.abs(
        firstArrival(stop).getTime() -
          arrivedBefore.get(stop.outletId)!.getTime(),
      ) >
      Math.abs(
        firstArrival(most).getTime() -
          arrivedBefore.get(most.outletId)!.getTime(),
      )
        ? stop
        : most,
    );
    const window = deliveryWindow(impact.outlet);
    const reached =
      minuteOfDay(firstArrival(impact)) + impact.rows[0].plannedWaitMin;
    const snapshot = (stops: Stop[], against?: Stop[]): RouteChangeStop[] =>
      stops.map((stop, i) => {
        const was = against ? against.indexOf(stop) : i;
        return {
          name: outletName(stop.outlet),
          area: travel.name,
          completed: stop.state === 'completed',
          movement: i < was ? 'up' : i > was ? 'down' : 'none',
        };
      });
    const planVersion = trip.planVersion + 1;

    await this.inTransaction(async (manager) => {
      // The (trip, seq) unique constraint is deferred, so rows can pass
      // through each other's numbers inside the transaction.
      for (const [i, row] of rows.entries()) {
        await this.tripsRepository.updateStops(
          [row.id],
          {
            seq: i + 1,
            plannedArrivalAt: row.plannedArrivalAt,
            plannedWaitMin: row.plannedWaitMin,
            updatedById: user.userId,
          },
          manager,
        );
      }
      await this.tripsRepository.updateTrip(
        trip.id,
        { planVersion, updatedById: user.userId },
        manager,
      );
      await this.tripsRepository.saveRouteChange(
        {
          tripId: trip.id,
          planVersion,
          reason: dto.reason.trim(),
          previous: snapshot(before),
          updated: snapshot(after, before),
          impactStopName: outletName(impact.outlet),
          impactArrivalWas: arrivedBefore.get(impact.outletId)!,
          impactArrivalNow: firstArrival(impact),
          tightWindow:
            toMinutes(window.windowClose) - reached < TIGHT_WINDOW_MIN
              ? `Window closes ${window.windowClose}`
              : null,
          createdById: user.userId,
          updatedById: user.userId,
        },
        manager,
      );
    });

    return new ApiResponseDto(
      HttpStatus.OK,
      'Stops reordered',
      await this.viewOf(tripId),
    );
  }

  /** The newest reorder the driver has not yet acknowledged, or null. */
  async findRouteChange(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    await this.loadFor(tripId, user);
    const change = await this.tripsRepository.findLatestRouteChange(
      tripId,
      true,
    );

    return new ApiResponseDto(
      HttpStatus.OK,
      change ? 'Route change retrieved successfully' : 'No route change',
      change && this.toRouteChangeView(change),
    );
  }

  /** The driver has seen the new stop order. */
  async acknowledgeRouteChange(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    await this.loadFor(tripId, user);
    await this.tripsRepository.acknowledgeRouteChanges(tripId, user.userId);
    const change = await this.tripsRepository.findLatestRouteChange(
      tripId,
      false,
    );
    if (!change) {
      throw new NotFoundException('This trip has no route change');
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Route change acknowledged',
      this.toRouteChangeView(change),
    );
  }

  /**
   * The trip, if the caller may see it: a driver their own, a loader their
   * depot's, a dispatcher any. A draft or cancelled trip does not exist as
   * far as drivers and loaders are concerned.
   */
  async loadFor(tripId: string, user: AuthenticatedUser): Promise<Trip> {
    const trip = await this.tripsRepository.findDetail(tripId);
    const hidden =
      trip?.status === TripStatus.DRAFT ||
      trip?.status === TripStatus.CANCELLED;
    if (!trip || (hidden && user.role !== UserRole.DISPATCHER)) {
      throw new NotFoundException(`Trip with ID "${tripId}" not found`);
    }
    if (
      user.role === UserRole.DRIVER &&
      (trip.driverId ?? trip.vehicle!.driverId) !== user.userId
    ) {
      throw new ForbiddenException('This trip is not assigned to you');
    }
    if (user.role === UserRole.LOADER) {
      const loader = await this.usersRepository.findById(user.userId);
      if (loader?.depotId !== trip.depotId) {
        throw new ForbiddenException('This trip belongs to another depot');
      }
    }
    return trip;
  }

  /**
   * The stop an arrival or completion is for, with the stops before it and
   * the rest. Refused while the trip is not on the road, and when the driver
   * was looking at a route that has since been reordered.
   */
  private async stopForAction(trip: Trip, stopId: number, planVersion: number) {
    if (trip.status === TripStatus.COMPLETED) {
      // Every stop is already recorded, so a late retry has nothing to change.
      const stops = stopsOf(trip);
      const stop = stops.find((candidate) => candidate.outletId === stopId);
      if (stop) {
        return { stop, earlier: [], others: [] };
      }
    }
    if (trip.status !== TripStatus.DISPATCHED) {
      throw await this.conflict('The trip is not on the road', trip);
    }
    if (planVersion !== trip.planVersion) {
      throw await this.conflict(
        'The stop order has changed. Review the route update first',
        trip,
      );
    }
    const stops = stopsOf(trip);
    const index = stops.findIndex((stop) => stop.outletId === stopId);
    if (index < 0) {
      throw new NotFoundException('This trip has no such stop');
    }
    return {
      stop: stops[index],
      earlier: stops.slice(0, index),
      others: stops.filter((_, i) => i !== index),
    };
  }

  /** The stop's rows with the cases delivered for each, checked against the order. */
  private deliveredPerRow(
    stop: Stop,
    deliveredCases: Record<string, number>,
  ): Map<TripStop, number> {
    const byOrder = new Map(
      Object.entries(deliveredCases).map(([reference, units]) => [
        orderIdFromReference(reference),
        units,
      ]),
    );
    if (byOrder.size !== stop.rows.length) {
      throw new BadRequestException(
        'deliveredCases must give a number for each order at this stop',
      );
    }
    return new Map(
      stop.rows.map((row) => {
        const units = byOrder.get(row.orderId);
        const total = row.order!.orderUnits;
        if (
          typeof units !== 'number' ||
          !Number.isInteger(units) ||
          units < 0 ||
          units > total
        ) {
          throw new BadRequestException(
            `deliveredCases for ${orderReference(row.orderId)} must be a whole number from 0 to ${total}`,
          );
        }
        return [row, units] as const;
      }),
    );
  }

  private rowOfOrder(rows: TripStop[], reference: string): TripStop {
    const orderId = orderIdFromReference(reference);
    const row = rows.find((candidate) => candidate.orderId === orderId);
    if (!row) {
      throw new BadRequestException(`${reference} is not on this trip`);
    }
    return row;
  }

  /** A 409 that carries the trip as it stands, so the handset can catch up. */
  private async conflict(
    message: string,
    trip: Trip,
  ): Promise<ConflictException> {
    return new ConflictException({ message, data: await this.toView(trip) });
  }

  private async viewOf(tripId: string) {
    return this.toView((await this.tripsRepository.findDetail(tripId))!);
  }

  private async inTransaction(
    work: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await work(queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        (error as Error).message || 'Could not update the trip',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /** The trip as the list shows it: no stops, just how far along it is. */
  private toSummary(trip: Trip) {
    const stops = stopsOf(trip);
    return {
      id: trip.id,
      name: `Trip ${trip.tripNo}`,
      subtitle: `${trip.brand} deliveries · ${trip.district!.name}`,
      departure: trip.plannedDepartAt,
      status: TRIP_STATUS[trip.status],
      planVersion: trip.planVersion,
      updatedAt: trip.updatedAt,
      vehicle: {
        id: trip.vehicleId,
        plate: trip.vehicle!.uniqueId,
        type: vehicleLabel(trip.vehicle!),
      },
      stopCount: stops.length,
      completedStops: stops.filter((stop) => stop.state === 'completed').length,
    };
  }

  /** The whole trip, in the shape the driver app's trip screen reads. */
  private async toView(trip: Trip) {
    const shortfall = await this.tripsRepository.findShortfall(trip.id);
    const travel = trip.district!;

    return {
      ...this.toSummary(trip),
      depot: trip.depot!.name,
      shortfall: shortfall?.order && {
        orderId: orderReference(shortfall.order.id),
        storeName: outletName(shortfall.order.outlet!),
        shortCases: shortfall.affectedUnits,
        plannedCases: shortfall.order.orderUnits,
        dispatcherNote: shortfall.description,
      },
      stops: stopsOf(trip).map((stop, i) => {
        const { outlet, rows } = stop;
        const window = deliveryWindow(outlet);
        return {
          id: String(outlet.id),
          sequence: i + 1,
          name: outletName(outlet),
          deliveryWindow: `${window.windowOpen}-${window.windowClose}`,
          plannedArrival: rows[0].plannedArrivalAt,
          dock: DOCK_LABELS[outlet.dockType],
          lat: outlet.lat,
          lng: outlet.lng,
          contactPhone: outlet.contactPhone,
          status: stop.state,
          arrivedAt: rows[0].actualArrivalAt,
          // Clear-road planning figures from the previous point: the depot for
          // the first stop, the stop before for the rest.
          etaMinutes:
            i === 0
              ? travel.depotToDistrictFreeflowMin
              : travel.interStopFreeflowMin,
          distanceKm: i === 0 ? travel.depotToDistrictKm : travel.interStopKm,
          orders: rows.map((row) => {
            const order = row.order!;
            const chilled = order.tempRequirement === TempRequirement.CHILLED;
            return {
              id: orderReference(order.id),
              storeName: outletName(outlet),
              cases: order.orderUnits,
              temperature: order.tempRequirement,
              status: RECORDED.has(row.status)
                ? 'delivered'
                : 'pending_delivery',
              deliveredCases: row.deliveredUnits,
              handling:
                [chilled && 'Keep below 4°C', order.notes]
                  .filter(Boolean)
                  .join('. ') || null,
            };
          }),
        };
      }),
    };
  }

  private toRouteChangeView(change: RouteChange) {
    return {
      tripId: change.tripId,
      planVersion: change.planVersion,
      updatedAt: change.createdAt,
      reason: change.reason,
      previous: change.previous,
      updated: change.updated,
      impactStopName: change.impactStopName,
      impactArrivalNow: change.impactArrivalNow,
      impactArrivalWas: change.impactArrivalWas,
      tightWindow: change.tightWindow,
      acknowledged: !!change.acknowledgedAt,
    };
  }
}
