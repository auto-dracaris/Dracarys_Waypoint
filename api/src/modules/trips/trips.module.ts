import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryProof } from '../../database/entities/delivery-proof.entity';
import { Trip } from '../../database/entities/trip.entity';
import { SmsModule } from '../../common/sms/sms.module';
import { AuthModule } from '../auth/auth.module';
import { ImagesModule } from '../images/images.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { TripRecordsRepository } from './repositories/trip-records.repository';
import { TripsRepository } from './repositories/trips.repository';
import { TripRecordsController } from './trip-records.controller';
import { TripCodesService } from './trip-codes.service';
import { TripRecordsService } from './trip-records.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, DeliveryProof]),
    AuthModule,
    UsersModule,
    ImagesModule,
    SmsModule,
    NotificationsModule,
  ],
  controllers: [TripsController, TripRecordsController],
  providers: [
    TripsService,
    TripsRepository,
    TripCodesService,
    TripRecordsService,
    TripRecordsRepository,
  ],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}
