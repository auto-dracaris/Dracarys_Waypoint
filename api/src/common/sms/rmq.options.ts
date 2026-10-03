import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

/**
 * Producer side (`ClientsModule`). The queue settings are shared with the
 * consumer below: both sides assert the queue, and RabbitMQ rejects an assert
 * whose arguments differ from the existing queue — so they must match.
 */
export function buildSmsRmqOptions(configService: ConfigService): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>(
          'RABBITMQ_URL',
          'amqp://waypoint_user:waypoint_password@localhost:5672',
        ),
      ],
      queue: configService.get<string>('SMS_QUEUE', 'sms_queue'),
      queueOptions: { durable: true },
      persistent: true,
    },
  };
}

/**
 * Consumer side (the microservice connected in main.ts): manual acks so a
 * message survives a crash mid-send. Not set on the producer — the client also
 * consumes RabbitMQ's direct reply-to queue with `noAck`, and that queue
 * refuses a manual-ack consumer.
 */
export function buildSmsRmqConsumerOptions(
  configService: ConfigService,
): RmqOptions {
  const { options } = buildSmsRmqOptions(configService);
  return {
    transport: Transport.RMQ,
    options: { ...options, noAck: false, prefetchCount: 5 },
  };
}
