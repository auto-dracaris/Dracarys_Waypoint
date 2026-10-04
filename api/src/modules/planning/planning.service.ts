import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { DeferralReason } from '../../common/enums/deferral-reason.enum';
import { Depot } from '../../common/enums/depot.enum';
import { ParkingConstraint } from '../../common/enums/parking-constraint.enum';
import { PriorityIndexStatus } from '../../common/enums/priority-index-status.enum';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { atMinute, today } from '../../common/utils/date.util';
import { deliveryWindow } from '../../common/utils/outlet.util';
import { orderReference } from '../../common/utils/order.util';
import { Order } from '../../database/entities/order.entity';
import { PriorityIndex } from '../../database/entities/priority-index.entity';
import { Trip } from '../../database/entities/trip.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { notice } from '../notifications/notification.catalog';
import { NotificationsService } from '../notifications/notifications.service';
import { Outgoing } from '../notifications/notifications.service';
import { OrdersRepository } from '../orders/repositories/orders.repository';
import { PlanQueryDto } from './dto/plan-query.dto';
import { allocate } from './engine/allocation';
import {
  scheduleVehicle,
  tripsByVehicle,
  validate,
} from './engine/feasibility';
import {
  AllocationResult,
  DeferredOrder,
  Issue,
  PlanningInput,
  PriorityResult,
  allowanceKey,
} from './engine/planning.types';
import { calculatePriorities } from './engine/priority';
import {
  DraftTrip,
  PlanningRepository,
} from './repositories/planning.repository';

// The booklet's daily budgets: a vehicle's Fresh trips share 270 minutes, its
// Style and Tech trips 480, and it runs at most two trips.
const BUDGETS = { freshMinutes: 270, otherMinutes: 480, maxTripsPerVehicle: 2 };

const DAY_MS = 24 * 60 * 60 * 1000;

type PlanState = 'none' | 'draft' | 'published';

/** What a run works from: the algorithms' input plus what never reaches them. */
interface Gathered {
  depotId: number;
  input: PlanningInput;
  // Orders the run defers itself, before the algorithms see the rest.
  sidelined: DeferredOrder[];
  vehicles: Map<number, Vehicle>;
  districtIds: Map<string, number>;
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly planningRepository: PlanningRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Plans one depot's deliveries for one day and saves the result as a draft,
   * replacing any earlier draft. `actorId` is the dispatcher who ran it, or
   * null for the 16:00 run.
   */
  async run(
    dto: PlanQueryDto,
    actorId: number | null,
  ): Promise<ApiResponseDto> {
    const gathered = await this.gather(dto);
    const { depotId, input, sidelined } = gathered;
    if ((await this.stateOf(depotId, dto.date)) === 'published') {
      throw new ConflictException(
        `The ${dto.depot} plan for ${dto.date} is already published`,
      );
    }

    const priorities = calculatePriorities(input);
    const allocation = allocate(input, priorities);
    const deferred = [...allocation.deferred, ...sidelined];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.planningRepository.replaceDraft(
        depotId,
        dto.date,
        this.toDraftTrips(gathered, allocation, actorId),
        this.toPriorityRows(dto.date, priorities, deferred, actorId),
        queryRunner.manager,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        (error as Error).message || 'Could not save the plan',
      );
    } finally {
      await queryRunner.release();
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Planning run completed',
      await this.buildPlan(dto),
    );
  }

  async findPlan(query: PlanQueryDto): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Plan retrieved successfully',
      await this.buildPlan(query),
    );
  }

  /** The dispatcher accepts the draft; see `PlanningRepository.publishDraft`. */
  async publish(dto: PlanQueryDto, actorId: number): Promise<ApiResponseDto> {
    const plan = await this.buildPlan(dto);
    if (plan.state !== 'draft') {
      throw new ConflictException(
        plan.state === 'published'
          ? `The ${dto.depot} plan for ${dto.date} is already published`
          : 'Run planning before publishing',
      );
    }
    if (plan.issues.length) {
      throw new BadRequestException(
        `The plan has ${plan.issues.length} ${plan.issues.length === 1 ? 'issue' : 'issues'} to resolve first: ${plan.issues[0].message}`,
      );
    }
    const deferredToDate = await this.ordersRepository.findNextOperatingDay(
      dto.date,
    );
    // Read before the draft is published, while it is still told apart from
    // anything published earlier.
    const [trips, priorities] = await Promise.all([
      this.planningRepository.findTrips(plan.depotId, dto.date),
      this.planningRepository.findPriorities(plan.depotId, dto.date),
    ]);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.planningRepository.publishDraft(
        plan.depotId,
        dto.date,
        deferredToDate,
        actorId,
        queryRunner.manager,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        (error as Error).message || 'Could not publish the plan',
      );
    } finally {
      await queryRunner.release();
    }
    void this.notificationsService.notify(
      this.publishNotices(
        plan.depotId,
        dto.date,
        deferredToDate,
        trips,
        priorities,
      ),
    );

    return new ApiResponseDto(
      HttpStatus.OK,
      'Plan published successfully',
      await this.buildPlan(dto),
    );
  }

  /**
   * Orders for the next operating day close at 16:00, so each depot's run for
   * that day is drafted then. It never publishes, and leaves a depot alone if
   * a dispatcher has already run or published its plan.
   */
  @Cron('0 16 * * *', { timeZone: 'Asia/Colombo' })
  async runAtCutoff(): Promise<void> {
    const date = await this.ordersRepository.findNextOperatingDay(today());
    if (!date) {
      return;
    }
    for (const depot of Object.values(Depot)) {
      try {
        const { depotId } = await this.gather({ date, depot });
        if ((await this.stateOf(depotId, date)) === 'none') {
          const { data } = await this.run({ date, depot }, null);
          const { trips, deferred } = (
            data as { totals: { trips: number; deferred: number } }
          ).totals;
          // A day with nothing ordered has no draft worth a look.
          if (trips || deferred) {
            void this.notificationsService.notify([
              {
                to: { dispatchers: true },
                ...notice.planDraftReady({ depot, date, trips, deferred }),
              },
            ]);
          }
        }
      } catch (error) {
        this.logger.error(
          `Cutoff run for ${depot} on ${date} failed: ${(error as Error).message}`,
        );
        void this.notificationsService.notify([
          {
            to: { dispatchers: true },
            ...notice.planRunFailed(depot, date, (error as Error).message),
          },
        ]);
      }
    }
  }

  /**
   * Who hears about a published plan: each trip's driver, the depot's
   * loaders, and the store manager of every order, planned or deferred.
   */
  private publishNotices(
    depotId: number,
    date: string,
    deferredToDate: string | null,
    trips: Trip[],
    priorities: PriorityIndex[],
  ): Outgoing[] {
    const stops = trips.flatMap((trip) => trip.stops ?? []);
    return [
      ...trips.map((trip) => ({
        to: { userIds: [trip.driverId] },
        ...notice.tripAssigned({
          id: trip.id,
          tripNo: trip.tripNo,
          serviceDate: date,
          district: trip.district?.name ?? null,
          // Each order is its own stop row; a stop to a driver is an outlet.
          stops: new Set((trip.stops ?? []).map((stop) => stop.order!.outletId))
            .size,
        }),
      })),
      ...(trips.length
        ? [
            {
              to: { loadersOfDepot: depotId },
              ...notice.tripsToLoad(date, trips.length),
            },
          ]
        : []),
      ...stops.map((stop) => ({
        to: { storeManagersOfOutlets: [stop.order!.outletId] },
        ...notice.orderScheduled(stop.orderId, date),
      })),
      ...priorities
        .filter((priority) => priority.deferralReason)
        .map((priority) => ({
          to: { storeManagersOfOutlets: [priority.order!.outletId] },
          ...notice.orderDeferred(
            priority.orderId,
            priority.deferralReason!,
            deferredToDate,
          ),
        })),
    ];
  }

  /** Everything the algorithms need for one depot's run, read from the database. */
  private async gather({ date, depot }: PlanQueryDto): Promise<Gathered> {
    const depotRow = await this.planningRepository.findDepot(depot);
    const day = await this.planningRepository.findCalendarDay(date);
    if (!depotRow) {
      throw new BadRequestException('Depot not found');
    }
    if (!day?.isOperating) {
      throw new BadRequestException(`${date} is not a delivery day`);
    }

    const [orders, vehicles, districts, allowances] = await Promise.all([
      this.ordersRepository.findAwaiting(date, depot),
      this.planningRepository.findAvailableVehicles(depotRow.id),
      this.planningRepository.findDistricts(depotRow.id),
      this.planningRepository.findServiceAllowances(),
    ]);
    const [deferrals, lastDeliveries, committedFuel] = await Promise.all([
      this.planningRepository.countDeferrals(orders.map((order) => order.id)),
      this.planningRepository.findLastDeliveries([
        ...new Set(orders.map((order) => order.outletId)),
      ]),
      this.planningRepository.sumCommittedFuel(
        vehicles.map((vehicle) => vehicle.id),
        date,
      ),
    ]);

    // An outlet the dispatcher marked unavailable is left out of planning.
    const plannable = orders.filter((order) => order.outlet!.isAvailable);
    const sidelined = orders
      .filter((order) => !order.outlet!.isAvailable)
      .map((order) => ({
        orderId: order.id,
        reason: DeferralReason.OTHER,
        note: 'Outlet is marked unavailable',
      }));

    return {
      depotId: depotRow.id,
      sidelined,
      vehicles: new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
      districtIds: new Map(districts.map((d) => [d.name, d.id])),
      input: {
        planDate: date,
        depot,
        orders: plannable.map((order) => {
          const outlet = order.outlet!;
          const lastServed = lastDeliveries.get(order.outletId);
          return {
            id: order.id,
            outlet: outlet.uniqueId,
            brand: outlet.brand,
            district: outlet.district!.name,
            tempRequirement: order.tempRequirement,
            units: order.orderUnits,
            weightKg: order.orderWeightKg,
            volumeM3: order.orderVolumeM3,
            dockType: outlet.dockType,
            vanOnly: outlet.parkingConstraint === ParkingConstraint.VAN_ONLY,
            ...deliveryWindow(outlet),
            requestedDate: order.requestedDate,
            timesDeferred: deferrals.get(order.id) ?? 0,
            daysSinceLastServed: lastServed
              ? Math.round((Date.parse(date) - Date.parse(lastServed)) / DAY_MS)
              : null,
          };
        }),
        vehicles: vehicles.map((vehicle) => ({
          id: vehicle.id,
          ref: vehicle.uniqueId,
          type: vehicle.type,
          isRefrigerated: vehicle.isRefrigerated,
          weightCapKg: vehicle.weightCapKg,
          volumeCapM3: vehicle.volumeCapM3,
          kmPerL: vehicle.kmPerL,
          fuelRemainingL: Math.max(
            0,
            vehicle.weeklyFuelQuotaL - (committedFuel.get(vehicle.id) ?? 0),
          ),
        })),
        districts: Object.fromEntries(
          districts.map((district) => [
            district.name,
            {
              outboundMin: district.depotToDistrictFreeflowMin,
              outboundKm: district.depotToDistrictKm,
              interStopMin: district.interStopFreeflowMin,
              interStopKm: district.interStopKm,
            },
          ]),
        ),
        serviceAllowances: Object.fromEntries(
          allowances.map((allowance) => [
            allowanceKey(allowance.brand, allowance.dockType),
            allowance.serviceAllowanceMin,
          ]),
        ),
        day: {
          isPayday: day.isPayday,
          festivalRamp: day.festivalRamp,
          monsoon: day.monsoon,
        },
        budgets: BUDGETS,
      },
    };
  }

  /** The allocation as trips to save, with the times, distance and fuel worked out. */
  private toDraftTrips(
    { depotId, input, vehicles, districtIds }: Gathered,
    allocation: AllocationResult,
    actorId: number | null,
  ): DraftTrip[] {
    const date = input.planDate;
    const planned = new Map(input.vehicles.map((v) => [v.id, v]));
    const drafts: DraftTrip[] = [];

    for (const [vehicleId, trips] of tripsByVehicle(allocation.trips)) {
      const vehicle = planned.get(vehicleId);
      if (!vehicle) {
        // Not an available vehicle of this depot, so there is nothing to save
        // it against; `validate` reports the orders it left undecided.
        continue;
      }
      for (const schedule of scheduleVehicle(input, vehicle, trips)) {
        const districtId = districtIds.get(schedule.district);
        if (!districtId) {
          continue;
        }
        drafts.push({
          depotId,
          vehicleId,
          // A snapshot of who drives, since the vehicle's driver can change later.
          driverId: vehicles.get(vehicleId)?.driverId ?? null,
          brand: schedule.brand,
          districtId,
          serviceDate: date,
          tripNo: schedule.tripNo,
          plannedDepartAt: atMinute(date, schedule.departMin),
          plannedMinutes: Math.round(schedule.minutes),
          plannedKm: Math.round(schedule.km * 100) / 100,
          plannedFuelL: Math.round(schedule.fuelL * 100) / 100,
          totalWeightKg: Math.round(schedule.weightKg * 100) / 100,
          totalVolumeM3: Math.round(schedule.volumeM3 * 1000) / 1000,
          status: TripStatus.DRAFT,
          createdById: actorId,
          updatedById: actorId,
          stops: schedule.stops.map((stop, i) => ({
            orderId: stop.orderId,
            seq: i + 1,
            plannedArrivalAt: atMinute(date, stop.arrivalMin),
            plannedServiceMin: stop.serviceMin,
            plannedWaitMin: Math.round(stop.waitMin),
            createdById: actorId,
            updatedById: actorId,
          })),
        });
      }
    }
    return drafts;
  }

  /** One score row per order, carrying the proposed deferral where there is one. */
  private toPriorityRows(
    date: string,
    priorities: PriorityResult[],
    deferred: DeferredOrder[],
    actorId: number | null,
  ): Partial<PriorityIndex>[] {
    const deferrals = new Map(deferred.map((d) => [d.orderId, d]));
    const scores = new Map(priorities.map((p) => [p.orderId, p]));
    // Sidelined orders were never scored, but their deferral still needs a row.
    const orderIds = new Set([...scores.keys(), ...deferrals.keys()]);

    return [...orderIds].map((orderId) => ({
      orderId,
      planDate: date,
      score: scores.get(orderId)?.score ?? 0,
      factors: scores.get(orderId)?.factors ?? {},
      status: PriorityIndexStatus.PENDING,
      deferralReason: deferrals.get(orderId)?.reason ?? null,
      remark: deferrals.get(orderId)?.note ?? null,
      createdById: actorId,
      updatedById: actorId,
    }));
  }

  /** Whether the depot's day has a published plan, a draft, or nothing yet. */
  private async stateOf(depotId: number, date: string): Promise<PlanState> {
    const [trips, priorities] = await Promise.all([
      this.planningRepository.findTrips(depotId, date),
      this.planningRepository.findPriorities(depotId, date),
    ]);
    return this.stateFrom(trips, priorities);
  }

  // A plan with no trips at all (everything deferred) is still a plan, so the
  // scores count as well as the trips.
  private stateFrom(trips: Trip[], priorities: PriorityIndex[]): PlanState {
    if (
      trips.some((trip) => trip.status !== TripStatus.DRAFT) ||
      priorities.some((p) => p.status !== PriorityIndexStatus.PENDING)
    ) {
      return 'published';
    }
    return trips.length || priorities.length ? 'draft' : 'none';
  }

  /** The plan as the Planning page shows it. */
  private async buildPlan(query: PlanQueryDto) {
    const gathered = await this.gather(query);
    const { depotId, input } = gathered;
    const [trips, priorities] = await Promise.all([
      this.planningRepository.findTrips(depotId, query.date),
      this.planningRepository.findPriorities(depotId, query.date),
    ]);
    const state = this.stateFrom(trips, priorities);
    const deferred = priorities.filter((priority) => priority.deferralReason);
    const timesDeferred = await this.planningRepository.countDeferrals(
      deferred.map((priority) => priority.orderId),
    );

    // A draft is checked against today's facts every time it is read, so one
    // that has gone stale (an order deferred by hand, a vehicle taken off the
    // road, a new order placed) says so and cannot be published.
    const issues: Issue[] =
      state === 'draft'
        ? validate(input, {
            trips: trips.map((trip) => ({
              vehicleId: trip.vehicleId,
              tripNo: trip.tripNo as 1 | 2,
              orderIds: (trip.stops ?? []).map((stop) => stop.orderId),
            })),
            deferred: deferred.map((priority) => ({
              orderId: priority.orderId,
              reason: priority.deferralReason!,
            })),
          })
        : [];
    const assigned = trips.reduce(
      (sum, trip) => sum + (trip.stops?.length ?? 0),
      0,
    );
    const scores = new Map(priorities.map((p) => [p.orderId, p.score]));

    return {
      date: query.date,
      depot: query.depot,
      depotId,
      state,
      // Orders now waiting for this run; when there is no plan yet, this is
      // what a run would work on.
      awaiting: input.orders.length + gathered.sidelined.length,
      totals: {
        orders: assigned + deferred.length,
        assigned,
        trips: trips.length,
        deferred: deferred.length,
        issues: issues.length,
      },
      trips: trips.map((trip) => ({
        id: trip.id,
        tripNo: trip.tripNo,
        status: trip.status,
        brand: trip.brand,
        district: trip.district?.name ?? null,
        vehicle: {
          id: trip.vehicleId,
          uniqueId: trip.vehicle!.uniqueId,
          type: trip.vehicle!.type,
          isRefrigerated: trip.vehicle!.isRefrigerated,
          weightCapKg: trip.vehicle!.weightCapKg,
          volumeCapM3: trip.vehicle!.volumeCapM3,
        },
        plannedDepartAt: trip.plannedDepartAt,
        plannedMinutes: trip.plannedMinutes,
        plannedKm: trip.plannedKm,
        plannedFuelL: trip.plannedFuelL,
        totalWeightKg: trip.totalWeightKg,
        totalVolumeM3: trip.totalVolumeM3,
        stops: (trip.stops ?? []).map((stop) => ({
          seq: stop.seq,
          plannedArrivalAt: stop.plannedArrivalAt,
          plannedWaitMin: stop.plannedWaitMin,
          plannedServiceMin: stop.plannedServiceMin,
          score: scores.get(stop.orderId) ?? null,
          ...this.toOrderView(stop.order!),
        })),
      })),
      deferred: deferred.map((priority) => ({
        reason: priority.deferralReason,
        note: priority.remark,
        score: priority.score,
        // Deferrals already on record before this plan.
        timesDeferred:
          (timesDeferred.get(priority.orderId) ?? 0) -
          (state === 'published' ? 1 : 0),
        ...this.toOrderView(priority.order!),
      })),
      issues,
    };
  }

  private toOrderView(order: Order) {
    const outlet = order.outlet!;
    return {
      orderId: order.id,
      reference: orderReference(order.id),
      outlet: { uniqueId: outlet.uniqueId, name: outlet.name },
      tempRequirement: order.tempRequirement,
      orderWeightKg: order.orderWeightKg,
      orderVolumeM3: order.orderVolumeM3,
      ...deliveryWindow(outlet),
    };
  }
}
