import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { orderIdFromReference } from '../../../common/utils/order.util';
import { Issue } from '../../../database/entities/issue.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
import { Trip } from '../../../database/entities/trip.entity';
import { IssueStatus } from '../../../common/enums/issue-status.enum';
import { IssueType } from '../../../common/enums/issue-type.enum';
import { ResolveIssueDto } from '../dto/resolve-issue.dto';
import { QueryIssueDto } from '../dto/query-issue.dto';

@Injectable()
export class IssuesRepository extends BaseRepository<Issue> {
  constructor(
    @InjectRepository(Issue)
    repository: Repository<Issue>,
  ) {
    super(repository);
  }

  /**
   * An issue with everything it is shown with: the order and its outlet, the
   * trip and its vehicle, the photo, and only the public columns of whoever
   * reported and resolved it — never a password hash.
   */
  private detailed(): SelectQueryBuilder<Issue> {
    return this.repository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.order', 'order')
      .leftJoinAndSelect('order.outlet', 'outlet')
      .leftJoinAndSelect('issue.trip', 'trip')
      .leftJoinAndSelect('issue.tripStop', 'tripStop')
      .leftJoinAndSelect('issue.vehicle', 'vehicle')
      .leftJoinAndSelect('issue.photoImage', 'photoImage')
      .leftJoin('issue.reportedBy', 'reportedBy')
      .addSelect([
        'reportedBy.id',
        'reportedBy.firstName',
        'reportedBy.lastName',
        'reportedBy.role',
      ])
      .leftJoin('issue.resolvedBy', 'resolvedBy')
      .addSelect([
        'resolvedBy.id',
        'resolvedBy.firstName',
        'resolvedBy.lastName',
      ]);
  }

  findDetail(issueId: string): Promise<Issue | null> {
    return this.detailed().where('issue.id = :issueId', { issueId }).getOne();
  }

  // Issues are loaded with their relations, so they are changed by id rather
  // than saved back whole.
  async patch(issueId: string, changes: Partial<Issue>): Promise<void> {
    await this.repository.update({ id: issueId }, changes);
  }

  async resolve(
    issueId: string,
    dto: ResolveIssueDto,
    userId: number,
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!issue) throw new NotFoundException('Issue not found');
      if (issue.status === IssueStatus.RESOLVED)
        throw new ConflictException('Issue is already resolved');
      if (
        (dto.expectedCases !== undefined) !==
        (dto.planVersion !== undefined)
      ) {
        throw new BadRequestException(
          'expectedCases and planVersion must be supplied together',
        );
      }
      if (dto.expectedCases !== undefined) {
        if (
          !Number.isInteger(dto.expectedCases) ||
          dto.expectedCases < 0 ||
          !Number.isInteger(dto.planVersion) ||
          (dto.planVersion ?? 0) < 1
        ) {
          throw new BadRequestException(
            'Quantity and plan version must be valid whole numbers',
          );
        }
        if (
          ![IssueType.LOAD_SHORTFALL, IssueType.LOAD_DAMAGE].includes(
            issue.type,
          ) ||
          !issue.tripId ||
          !issue.tripStopId ||
          !issue.orderId
        ) {
          throw new BadRequestException(
            'Quantity approval requires a loading issue on an order',
          );
        }
        const trip = await manager.findOne(Trip, {
          where: { id: issue.tripId },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !trip ||
          ![TripStatus.PLANNED, TripStatus.LOADING].includes(trip.status)
        ) {
          throw new ConflictException(
            'Quantities can only change before loading is completed',
          );
        }
        if (trip.planVersion !== dto.planVersion)
          throw new ConflictException(
            'The trip plan changed. Refresh before approving.',
          );
        const stop = await manager.findOne(TripStop, {
          where: {
            id: issue.tripStopId,
            tripId: trip.id,
            orderId: issue.orderId,
          },
          relations: { order: true },
        });
        if (!stop?.order)
          throw new ConflictException('The order is no longer on this trip');
        const current = stop.expectedUnits ?? stop.order.orderUnits;
        if (
          dto.expectedCases > current ||
          current - dto.expectedCases > (issue.affectedUnits ?? 0)
        ) {
          throw new BadRequestException(
            'The reduction must be within the reported affected cases',
          );
        }
        if (dto.expectedCases !== current) {
          await manager.update(TripStop, stop.id, {
            expectedUnits: dto.expectedCases,
            updatedById: userId,
          });
          await manager.update(Trip, trip.id, {
            planVersion: trip.planVersion + 1,
            updatedById: userId,
          });
        }
      }
      await manager.update(Issue, issueId, {
        status: IssueStatus.RESOLVED,
        resolvedById: userId,
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote.trim(),
        updatedById: userId,
        approvedExpectedUnits: dto.expectedCases ?? null,
      });
    });
  }

  /** Newest first. `reporterId` narrows the list to one person's own reports. */
  findFiltered(
    query: QueryIssueDto,
    reporterId?: number,
  ): Promise<[Issue[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.detailed().where('issue.isActive = true');

    if (reporterId !== undefined) {
      qb.andWhere('issue.reportedById = :reporterId', { reporterId });
    }
    if (query.status) {
      qb.andWhere('issue.status = :status', { status: query.status });
    }
    if (query.type) {
      qb.andWhere('issue.type = :type', { type: query.type });
    }
    if (query.tripId) {
      qb.andWhere('issue.tripId = :tripId', { tripId: query.tripId });
    }
    if (query.orderId) {
      // A reference that is not one matches nothing.
      qb.andWhere('issue.orderId = :orderId', {
        orderId: orderIdFromReference(query.orderId) ?? 0,
      });
    }

    // Every join is to-one, so a plain page keeps one row per issue.
    return qb
      .orderBy('issue.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  /** The stop row that carried an order on its latest published trip, with that trip. */
  findStopOfOrder(orderId: number): Promise<TripStop | null> {
    return this.repository.manager
      .getRepository(TripStop)
      .createQueryBuilder('stop')
      .innerJoinAndSelect('stop.trip', 'trip')
      .where('stop.orderId = :orderId', { orderId })
      .andWhere('trip.status NOT IN (:...hidden)', {
        hidden: [TripStatus.DRAFT, TripStatus.CANCELLED],
      })
      .orderBy('trip.serviceDate', 'DESC')
      .getOne();
  }
}
