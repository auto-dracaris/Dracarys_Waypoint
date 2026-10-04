import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { setTimeout as sleep } from 'timers/promises';
import {
  LOCATION_STORE_PATTERN,
  type LocationJob,
} from './constants/location.constants';
import { VehiclesService } from './vehicles.service';

const REQUEUE_DELAY_MS = 1000;

@Controller()
export class VehicleLocationsConsumer {
  private readonly logger = new Logger(VehicleLocationsConsumer.name);

  constructor(private readonly vehiclesService: VehiclesService) {}

  @EventPattern(LOCATION_STORE_PATTERN)
  async handleStoreLocations(
    @Payload() job: LocationJob,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;

    try {
      await this.vehiclesService.storeLocations(job);
      channel.ack(message);
    } catch (error: any) {
      this.logger.error(
        `Failed to store locations for vehicle ${job.vehicleId}: ${error?.message || error}`,
        error?.stack,
      );
      // Back to the queue, so the handset's fixes outlast a database outage;
      // storing is idempotent, so a redelivery is safe. The pause keeps a
      // failing batch from spinning.
      // ponytail: requeues forever — add a dead-letter queue if a batch that
      // can never be stored shows up (the payload is validated before it is
      // queued and vehicles are never deleted, so none is expected).
      await sleep(REQUEUE_DELAY_MS);
      channel.nack(message, false, true);
    }
  }
}
