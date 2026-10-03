import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../database/entities/activity.entity';
import { Depot } from '../database/entities/depot.entity';
import { User } from '../database/entities/user.entity';
import { ActivityInterceptor } from './interceptors/activity.interceptor';
import { DepotsRepository } from './repositories/depots.repository';

/**
 * `@Global()` so the entities and services every module needs — users,
 * depots (every user and vehicle belongs to one) and activity logging — are
 * injectable anywhere without each feature module re-importing
 * `TypeOrmModule.forFeature` for them.
 * Feature-specific entities still get registered by their own module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Activity, Depot])],
  providers: [
    DepotsRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityInterceptor,
    },
  ],
  exports: [TypeOrmModule, DepotsRepository],
})
export class CommonModule {}
