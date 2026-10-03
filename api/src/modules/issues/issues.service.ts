import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  GOODS_ISSUE_TYPES,
  ISSUE_TITLES,
  ISSUE_TYPES_BY_ROLE,
} from '../../common/constants/issue.constant';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { ImagePurpose } from '../../common/enums/image-purpose.enum';
import { IssueStatus } from './enums';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  orderIdFromReference,
  orderReference,
} from '../../common/utils/order.util';
import { Issue } from '../../database/entities/issue.entity';
import { ImagesService } from '../images/images.service';
import { OrdersRepository } from '../orders/repositories/orders.repository';
import { TripsService } from '../trips/trips.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { CreateIssueDto } from './dto/create-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { IssuesRepository } from './repositories/issues.repository';

// A loader reports what goes wrong before the vehicle leaves.
const NOT_YET_LEFT = [
  TripStatus.PLANNED,
  TripStatus.LOADING,
  TripStatus.LOADED,
];

// A store manager reports on goods that have reached the outlet.
const REACHED_OUTLET = [
  OrderStatus.DOCKED,
  OrderStatus.DELIVERED,
  OrderStatus.FAILED,
];

/** What an issue is about, once the reporter's right to raise it is checked. */
interface IssueSubject {
  tripId: string | null;
  tripStopId: string | null;
  orderId: number | null;
  vehicleId: number | null;
  // The order's cases, where the issue names an order.
  orderUnits: number | null;
}

@Injectable()
export class IssuesService {
  constructor(
    private readonly issuesRepository: IssuesRepository,
    private readonly tripsService: TripsService,
    private readonly ordersRepository: OrdersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly imagesService: ImagesService,
  ) {}

  /**
   * One way in for every reporter. What a caller may report, and about what,
   * follows from their role; see `ISSUE_TYPES_BY_ROLE`.
   */
  async create(
    dto: CreateIssueDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    if (!ISSUE_TYPES_BY_ROLE[user.role]?.includes(dto.type)) {
      throw new BadRequestException(
        `A ${user.role.replace(/_/g, ' ')} cannot report a "${dto.type}" issue`,
      );
    }

    // A report sent again (a retry after working offline) is answered with
    // the one already stored.
    if (dto.clientId) {
      const existing = await this.issuesRepository.findDetail(dto.clientId);
      if (existing) {
        if (existing.reportedById !== user.userId) {
          throw new ConflictException('This clientId is already in use');
        }
        return new ApiResponseDto(
          HttpStatus.OK,
          'Issue already reported',
          this.toView(existing),
        );
      }
    }

    const aboutGoods = GOODS_ISSUE_TYPES.has(dto.type);
    if (aboutGoods && (!dto.orderId || !dto.affectedCases)) {
      throw new BadRequestException(
        `A "${dto.type}" issue must name the order and the cases affected`,
      );
    }
    const subject =
      user.role === UserRole.STORE_MANAGER
        ? await this.subjectForStoreManager(dto, user)
        : await this.subjectOnTrip(dto, user);
    if (
      dto.affectedCases &&
      subject.orderUnits !== null &&
      dto.affectedCases > subject.orderUnits
    ) {
      throw new UnprocessableEntityException(
        `${dto.orderId} has only ${subject.orderUnits} cases`,
      );
    }
    const photo = dto.photoImageId
      ? await this.imagesService.findForUse(
          dto.photoImageId,
          ImagePurpose.ISSUE_PHOTO,
          user.userId,
        )
      : null;

    const saved = await this.issuesRepository.save(
      this.issuesRepository.create({
        ...(dto.clientId && { id: dto.clientId }),
        type: dto.type,
        reportedById: user.userId,
        tripId: subject.tripId,
        tripStopId: subject.tripStopId,
        orderId: subject.orderId,
        vehicleId: subject.vehicleId,
        affectedUnits: dto.affectedCases ?? null,
        description: dto.note?.trim() || ISSUE_TITLES[dto.type],
        photoImageId: photo?.id ?? null,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        createdById: user.userId,
        updatedById: user.userId,
      }),
    );

    return new ApiResponseDto(
      HttpStatus.CREATED,
      'Issue reported',
      this.toView((await this.issuesRepository.findDetail(saved.id))!),
    );
  }

  /** Loaders may also review all reports on an active trip in their depot. */
  async findAll(
    query: QueryIssueDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    let reporterId =
      user.role === UserRole.DISPATCHER ? undefined : user.userId;
    if (user.role === UserRole.LOADER && query.tripId) {
      const trip = await this.tripsService.loadFor(query.tripId, user);
      if (NOT_YET_LEFT.includes(trip.status)) {
        reporterId = undefined;
      }
    }
    const [issues, total] = await this.issuesRepository.findFiltered(
      query,
      reporterId,
    );

    return new ApiResponseDto(HttpStatus.OK, 'Issues retrieved successfully', {
      items: issues.map((issue) => this.toView(issue)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async findOne(
    issueId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return new ApiResponseDto(
      HttpStatus.OK,
      'Issue retrieved successfully',
      this.toView(await this.findOrThrow(issueId, user)),
    );
  }

  /** The dispatcher has seen it. Doing so again, or after it is resolved, changes nothing. */
  async acknowledge(
    issueId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const issue = await this.findOrThrow(issueId, user);
    if (issue.status === IssueStatus.OPEN) {
      await this.issuesRepository.patch(issueId, {
        status: IssueStatus.ACKNOWLEDGED,
        updatedById: user.userId,
      });
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Issue acknowledged',
      this.toView((await this.issuesRepository.findDetail(issueId))!),
    );
  }

  /** The dispatcher closes it, saying what was done, and is recorded as who did. */
  async resolve(
    issueId: string,
    dto: ResolveIssueDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    const issue = await this.findOrThrow(issueId, user);
    if (issue.status === IssueStatus.RESOLVED) {
      throw new ConflictException('Issue is already resolved');
    }
    await this.issuesRepository.patch(issueId, {
      status: IssueStatus.RESOLVED,
      resolvedById: user.userId,
      resolvedAt: new Date(),
      resolutionNote: dto.resolutionNote.trim(),
      updatedById: user.userId,
    });

    return new ApiResponseDto(
      HttpStatus.OK,
      'Issue resolved',
      this.toView((await this.issuesRepository.findDetail(issueId))!),
    );
  }

  /**
   * A loader's or driver's issue is about a trip of theirs, and for goods an
   * order on it. `TripsService.loadFor` is what decides the trip is theirs.
   */
  private async subjectOnTrip(
    dto: CreateIssueDto,
    user: AuthenticatedUser,
  ): Promise<IssueSubject> {
    if (!dto.tripId) {
      throw new BadRequestException('tripId is required');
    }
    const trip = await this.tripsService.loadFor(dto.tripId, user);
    if (user.role === UserRole.LOADER && !NOT_YET_LEFT.includes(trip.status)) {
      throw new ConflictException(
        'A loading issue can only be reported before the trip leaves',
      );
    }

    const orderId = dto.orderId ? orderIdFromReference(dto.orderId) : null;
    const row = (trip.stops ?? []).find((stop) => stop.orderId === orderId);
    if (dto.orderId && !row) {
      throw new NotFoundException('That order is not on this trip');
    }
    return {
      tripId: trip.id,
      tripStopId: row?.id ?? null,
      orderId: row?.orderId ?? null,
      vehicleId: trip.vehicleId,
      orderUnits: row?.order?.orderUnits ?? null,
    };
  }

  /**
   * A store manager's issue is about an order of their own outlet that has
   * reached it. The trip and vehicle follow from the order.
   */
  private async subjectForStoreManager(
    dto: CreateIssueDto,
    user: AuthenticatedUser,
  ): Promise<IssueSubject> {
    if (!dto.orderId) {
      throw new BadRequestException('orderId is required');
    }
    const manager = await this.usersRepository.findById(user.userId);
    const order = await this.ordersRepository.findDetail(
      orderIdFromReference(dto.orderId) ?? 0,
    );
    // Another outlet's order reads as missing.
    if (!order || !manager?.outletId || order.outletId !== manager.outletId) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }
    if (!REACHED_OUTLET.includes(order.status)) {
      throw new UnprocessableEntityException(
        'An issue can be reported once the order has reached the outlet',
      );
    }
    const stop = await this.issuesRepository.findStopOfOrder(order.id);

    return {
      tripId: stop?.tripId ?? null,
      tripStopId: stop?.id ?? null,
      orderId: order.id,
      vehicleId: stop?.trip?.vehicleId ?? null,
      orderUnits: order.orderUnits,
    };
  }

  /** Someone who is not a dispatcher only reaches the issues they reported. */
  private async findOrThrow(
    issueId: string,
    user: AuthenticatedUser,
  ): Promise<Issue> {
    const issue = await this.issuesRepository.findDetail(issueId);
    if (
      !issue ||
      (user.role !== UserRole.DISPATCHER && issue.reportedById !== user.userId)
    ) {
      throw new NotFoundException(`Issue with ID "${issueId}" not found`);
    }
    return issue;
  }

  private toView(issue: Issue) {
    const { order, trip, vehicle, reportedBy, resolvedBy } = issue;
    return {
      id: issue.id,
      type: issue.type,
      title: ISSUE_TITLES[issue.type],
      status: issue.status,
      statusLabel: {
        [IssueStatus.OPEN]: 'Decision Pending',
        [IssueStatus.ACKNOWLEDGED]: 'Under Review',
        [IssueStatus.RESOLVED]: 'Approved',
      }[issue.status],
      description: issue.description,
      affectedCases: issue.affectedUnits,
      recordedAt: issue.recordedAt,
      createdAt: issue.createdAt,
      reportedBy: reportedBy && {
        id: reportedBy.id,
        name: `${reportedBy.firstName} ${reportedBy.lastName}`,
        role: reportedBy.role,
      },
      order: order && {
        reference: orderReference(order.id),
        cases: order.orderUnits,
        outlet: order.outlet && {
          uniqueId: order.outlet.uniqueId,
          name: order.outlet.name,
        },
      },
      trip: trip && {
        id: trip.id,
        tripNo: trip.tripNo,
        serviceDate: trip.serviceDate,
        vehicle: vehicle?.uniqueId ?? null,
      },
      photoUrl: issue.photoImage?.url ?? null,
      resolvedBy: resolvedBy && {
        id: resolvedBy.id,
        name: `${resolvedBy.firstName} ${resolvedBy.lastName}`,
      },
      resolvedAt: issue.resolvedAt,
      resolutionNote: issue.resolutionNote,
    };
  }
}
