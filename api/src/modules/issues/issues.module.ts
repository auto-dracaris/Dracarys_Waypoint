import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from '../../database/entities/issue.entity';
import { AuthModule } from '../auth/auth.module';
import { ImagesModule } from '../images/images.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { IssuesRepository } from './repositories/issues.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue]),
    AuthModule,
    TripsModule,
    OrdersModule,
    UsersModule,
    ImagesModule,
    NotificationsModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService, IssuesRepository],
})
export class IssuesModule {}
