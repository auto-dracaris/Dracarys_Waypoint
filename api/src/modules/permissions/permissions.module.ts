import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserAuthRepository } from '../auth/repositories/user-auth.repository';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { UserPermissionsRepository } from './repositories/user-permissions.repository';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [AuthModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionsRepository,
    UserPermissionsRepository,
    UserAuthRepository,
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
