import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../database/entities/activity.entity';
import { Permission } from '../database/entities/permission.entity';
import { User } from '../database/entities/user.entity';
import { UserPermission } from '../database/entities/user-permission.entity';
import { ActivityInterceptor } from './interceptors/activity.interceptor';
import { PermissionResolutionService } from './services/permission-resolution.service';

/**
 * `@Global()` so the entities and services every module needs — users, the
 * permission catalog, activity logging — are injectable anywhere without
 * each feature module re-importing `TypeOrmModule.forFeature` for them.
 * Feature-specific entities still get registered by their own module.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Permission, UserPermission, Activity]),
  ],
  providers: [
    PermissionResolutionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityInterceptor,
    },
  ],
  exports: [TypeOrmModule, PermissionResolutionService],
})
export class CommonModule {}
