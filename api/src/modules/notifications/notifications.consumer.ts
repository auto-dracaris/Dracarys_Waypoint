import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import {
  NOTIFICATION_PUSH_PATTERN,
  type PushJob,
} from './notification.constants';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern(NOTIFICATION_PUSH_PATTERN)
  async handlePush(
    @Payload() job: PushJob,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;

    try {
      await this.notificationsService.push(job);
    } catch (error: any) {
      this.logger.error(
        `Failed to push notifications: ${error?.message || error}`,
        error?.stack,
      );
    } finally {
      // Always ack — a push is a nudge, and the notification itself is
      // already stored for the app to list. A late one is worse than none.
      channel.ack(message);
    }
  }
}
