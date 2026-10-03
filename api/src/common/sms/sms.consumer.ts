import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { setTimeout as sleep } from 'timers/promises';
import { SMS_SEND_PATTERN, type SmsJob } from './sms.constants';
import { SmsGatewayService } from './sms-gateway.service';

const RETRY_DELAYS_MS = [1000, 3000];

@Controller()
export class SmsConsumer {
  private readonly logger = new Logger(SmsConsumer.name);

  constructor(private readonly smsGateway: SmsGatewayService) {}

  @EventPattern(SMS_SEND_PATTERN)
  async handleSendSms(
    @Payload() job: SmsJob,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;

    try {
      for (let attempt = 0; ; attempt++) {
        if (await this.smsGateway.sendSms(job.recipient, job.message)) {
          return;
        }
        if (attempt >= RETRY_DELAYS_MS.length) {
          this.logger.error(
            `Giving up on SMS to ${job.recipient} after ${attempt + 1} attempts`,
          );
          return;
        }
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    } finally {
      // Always ack — a failing gateway must not cause an endless redelivery loop.
      channel.ack(message);
    }
  }
}
