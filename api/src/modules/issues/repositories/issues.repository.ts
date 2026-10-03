import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { orderIdFromReference } from '../../../common/utils/order.util';
import { Issue } from '../../../database/entities/issue.entity';
import { TripStop } from '../../../database/entities/trip-stop.entity';
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
