import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OutletsModule } from '../outlets/outlets.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

// User is registered by the @Global() CommonModule, so there is no
// TypeOrmModule.forFeature here.
@Module({
  imports: [AuthModule, OutletsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
