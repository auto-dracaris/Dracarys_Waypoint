import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { Notification } from '../../database/entities/notification.entity';
import { UsersRepository } from '../users/repositories/users.repository';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import type { Notice } from './notification.catalog';
import {
  NOTIFICATION_CLIENT,
  NOTIFICATION_PUSH_PATTERN,
  PushJob,
} from './notification.constants';
import { PushService } from './push.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { UserDevicesRepository } from './repositories/user-devices.repository';

const PUBLISH_TIMEOUT_MS = 5000;

/** Who a notice goes to. The groups are looked up when it is sent. */
export interface Recipients {
  // Ids already at hand: a trip's driver, an issue's reporter.
  userIds?: (number | null | undefined)[];
  dispatchers?: boolean;
  loadersOfDepot?: number;
  storeManagersOfOutlets?: number[];
}

export type Outgoing = Notice & { to: Recipients };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly devicesRepository: UserDevicesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly pushService: PushService,
    @Inject(NOTIFICATION_CLIENT) private readonly client: ClientProxy,
  ) {}

  /**
   * Stores each notice for its recipients and queues the pushes. Call it
   * without awaiting, after the work it reports has been saved: it never
   * throws, so a notification that fails cannot fail or slow what caused it.
   */
  async notify(outgoing: Outgoing[]): Promise<void> {
    try {
      const messages = await Promise.all(
        outgoing.map(async ({ to, ...notice }) => ({
          notice,
          userIds: await this.resolve(to),
        })),
      );
      const rows = messages.flatMap(({ notice, userIds }) =>
        userIds.map((userId) => ({ ...notice, userId })),
      );
      if (!rows.length) {
        return;
      }
      await this.notificationsRepository.insertMany(rows);

      const job: PushJob = {
        messages: messages
          .filter(({ userIds }) => userIds.length)
          .map(({ notice, userIds }) => ({
            userIds,
            title: notice.title,
            body: notice.body,
            data: { ...notice.data, type: notice.type },
          })),
      };
      await lastValueFrom(
        this.client
          .emit(NOTIFICATION_PUSH_PATTERN, job)
          .pipe(timeout(PUBLISH_TIMEOUT_MS)),
        { defaultValue: undefined },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send notifications: ${error?.message || error}`,
        error?.stack,
      );
    }
  }

  /** The consumer's half of `notify`: sends a queued job to the handsets. */
  async push(job: PushJob): Promise<void> {
    const devices = await this.devicesRepository.findOfUsers([
      ...new Set(job.messages.flatMap((message) => message.userIds)),
    ]);
    for (const { userIds, ...message } of job.messages) {
      const tokens = devices
        .filter((device) => userIds.includes(device.userId))
        .map((device) => device.token);
      if (tokens.length) {
        await this.devicesRepository.removeTokens(
          await this.pushService.send(tokens, message),
        );
      }
    }
  }

  async findMine(
    userId: number,
    query: NotificationQueryDto,
  ): Promise<ApiResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [[items, total], unreadCount] = await Promise.all([
      this.notificationsRepository.findForUser(
        userId,
        page,
        limit,
        query.unread ?? false,
      ),
      this.notificationsRepository.countUnread(userId),
    ]);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Notifications retrieved successfully',
      {
        items: items.map((item) => this.toView(item)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        unreadCount,
      },
    );
  }

  async markRead(id: string, userId: number): Promise<ApiResponseDto> {
    // Someone else's notification reads as missing.
    const notification = await this.notificationsRepository.findOwn(id, userId);
    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      notification.updatedById = userId;
      await this.notificationsRepository.save(notification);
    }

    return new ApiResponseDto(
      HttpStatus.OK,
      'Notification marked as read',
      this.toView(notification),
    );
  }

  async markAllRead(userId: number): Promise<ApiResponseDto> {
    await this.notificationsRepository.markAllRead(userId);
    return new ApiResponseDto(HttpStatus.OK, 'Notifications marked as read');
  }

  async registerDevice(
    userId: number,
    dto: RegisterDeviceDto,
  ): Promise<ApiResponseDto> {
    await this.devicesRepository.register(userId, dto.token, dto.platform);
    return new ApiResponseDto(HttpStatus.OK, 'Device registered');
  }

  async removeDevice(userId: number, token: string): Promise<ApiResponseDto> {
    await this.devicesRepository.removeOwn(userId, token);
    return new ApiResponseDto(HttpStatus.OK, 'Device removed');
  }

  private async resolve(to: Recipients): Promise<number[]> {
    const ids = new Set<number>();
    for (const id of to.userIds ?? []) {
      if (id != null) {
        ids.add(id);
      }
    }
    if (to.dispatchers) {
      (
        await this.usersRepository.findActiveIdsByRole(UserRole.DISPATCHER)
      ).forEach((id) => ids.add(id));
    }
    if (to.loadersOfDepot) {
      (
        await this.usersRepository.findActiveIdsByRole(
          UserRole.LOADER,
          to.loadersOfDepot,
        )
      ).forEach((id) => ids.add(id));
    }
    if (to.storeManagersOfOutlets?.length) {
      (
        await this.usersRepository.findStoreManagersOfOutlets(
          to.storeManagersOfOutlets,
        )
      ).forEach((user) => ids.add(user.id));
    }
    return [...ids];
  }

  private toView(notification: Notification) {
    return {
      id: notification.id,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: notification.readAt !== null,
      createdAt: notification.sentAt,
    };
  }
}
