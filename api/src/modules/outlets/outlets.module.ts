import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outlet } from '../../database/entities/outlet.entity';
import { AuthModule } from '../auth/auth.module';
import { OutletsController } from './outlets.controller';
import { OutletsRepository } from './repositories/outlets.repository';
import { OutletsService } from './outlets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Outlet]), AuthModule],
  controllers: [OutletsController],
  providers: [OutletsService, OutletsRepository],
  exports: [OutletsService, OutletsRepository],
})
export class OutletsModule {}
