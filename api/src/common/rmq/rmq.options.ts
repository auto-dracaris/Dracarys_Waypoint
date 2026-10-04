import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

/**
 * Producer side (`ClientsModule`). The queue settings are shared with the
 * consumer below: both sides assert the queue, and RabbitMQ rejects an assert
 * whose arguments differ from the existing queue — so they must match.
 */
export function buildRmqOptions(
  configService: ConfigService,
  queue: string,
): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>(
          'RABBITMQ_URL',
          'amqp://waypoint_user:waypoint_password@localhost:5672',
        ),
      ],
      queue,
      queueOptions: { durable: true },
      persistent: true,
    },
  };
}

/**
 * Consumer side (a microservice connected in main.ts): manual acks so a
 * message survives a crash mid-handling. Not set on the producer — the client
 * also consumes RabbitMQ's direct reply-to queue with `noAck`, and that queue
 * refuses a manual-ack consumer.
 */
export function buildRmqConsumerOptions(
  configService: ConfigService,
  queue: string,
  prefetchCount: number,
): RmqOptions {
  const { options } = buildRmqOptions(configService, queue);
  return {
    transport: Transport.RMQ,
    options: { ...options, noAck: false, prefetchCount },
  };
}

export const smsQueue = (configService: ConfigService): string =>
  configService.get<string>('SMS_QUEUE', 'sms_queue');

export const locationQueue = (configService: ConfigService): string =>
  configService.get<string>('LOCATION_QUEUE', 'vehicle_location_queue');

export const notificationQueue = (configService: ConfigService): string =>
  configService.get<string>('NOTIFICATION_QUEUE', 'notification_queue');
