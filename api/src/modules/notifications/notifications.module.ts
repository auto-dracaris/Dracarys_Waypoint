import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  buildRmqOptions,
  notificationQueue,
} from '../../common/rmq/rmq.options';
import { Notification } from '../../database/entities/notification.entity';
import { UserDevice } from '../../database/entities/user-device.entity';
import { UsersModule } from '../users/users.module';
import { NOTIFICATION_CLIENT } from './notification.constants';
import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { UserDevicesRepository } from './repositories/user-devices.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserDevice]),
    UsersModule,
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          buildRmqOptions(configService, notificationQueue(configService)),
      },
    ]),
  ],
  controllers: [NotificationsController, NotificationsConsumer],
  providers: [
    NotificationsService,
    NotificationsRepository,
    UserDevicesRepository,
    PushService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
