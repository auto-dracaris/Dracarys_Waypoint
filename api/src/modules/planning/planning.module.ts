import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../../database/entities/trip.entity';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningRepository } from './repositories/planning.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Trip]), AuthModule, OrdersModule],
  controllers: [PlanningController],
  providers: [PlanningService, PlanningRepository],
  exports: [PlanningService],
})
export class PlanningModule {}
