import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../database/entities/activity.entity';
import { User } from '../database/entities/user.entity';
import { ActivityInterceptor } from './interceptors/activity.interceptor';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

/**
 * `@Global()` so the entities and services every module needs — users and
 * activity logging — are injectable anywhere without
 * each feature module re-importing `TypeOrmModule.forFeature` for them.
 * Feature-specific entities still get registered by their own module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Activity]), CloudinaryModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityInterceptor,
    },
  ],
  exports: [TypeOrmModule, CloudinaryModule],
})
export class CommonModule {}
