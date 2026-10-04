import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildRmqOptions, locationQueue } from '../../common/rmq/rmq.options';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { LOCATION_CLIENT } from './constants/location.constants';
import { VehicleLocationsConsumer } from './vehicle-locations.consumer';
import { VehiclesController } from './vehicles.controller';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
    AuthModule,
    UsersModule,
    ClientsModule.registerAsync([
      {
        name: LOCATION_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          buildRmqOptions(configService, locationQueue(configService)),
      },
    ]),
  ],
  controllers: [VehiclesController, VehicleLocationsConsumer],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService, VehiclesRepository],
})
export class VehiclesModule {}
