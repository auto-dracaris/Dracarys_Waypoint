import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Notification } from '../../../database/entities/notification.entity';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notification> {
  constructor(
    @InjectRepository(Notification)
    repository: Repository<Notification>,
  ) {
    super(repository);
  }

  async insertMany(rows: DeepPartial<Notification>[]): Promise<void> {
    await this.repository.insert(rows);
  }

  /** A user's notifications, newest first. */
  findForUser(
    userId: number,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<[Notification[], number]> {
    return this.findAndCount(page, limit, {
      where: { userId, ...(unreadOnly && { readAt: IsNull() }) },
      order: { sentAt: 'DESC' },
    });
  }

  countUnread(userId: number): Promise<number> {
    return this.repository.countBy({ userId, readAt: IsNull() });
  }

  findOwn(id: string, userId: number): Promise<Notification | null> {
    return this.repository.findOneBy({ id, userId });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date(), updatedById: userId },
    );
  }
}
