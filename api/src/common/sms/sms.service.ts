import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { formatPhoneNumber } from '../utils/phone.util';
import { SMS_CLIENT, SMS_SEND_PATTERN, SmsJob } from './sms.constants';

/**
 * Producer: queues an SMS and returns as soon as RabbitMQ has the message.
 * The gateway call happens in `SmsConsumer`, off the request path.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(SMS_CLIENT) private readonly client: ClientProxy) {}

  async sendSms(recipient: string, message: string): Promise<void> {
    const job: SmsJob = { recipient: formatPhoneNumber(recipient), message };

    // SMS failure never fails the calling flow (e.g. registration) — log only.
    try {
      await lastValueFrom(this.client.emit(SMS_SEND_PATTERN, job), {
        defaultValue: undefined,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to queue SMS to ${job.recipient}: ${error?.message || error}`,
        error?.stack,
      );
    }
  }
}
