import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Depot } from '../../database/entities/depot.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { VehiclesController } from './vehicles.controller';
import { DepotsRepository } from './repositories/depots.repository';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Depot]),
    AuthModule,
    UsersModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository, DepotsRepository],
  exports: [VehiclesService, VehiclesRepository],
})
export class VehiclesModule {}
