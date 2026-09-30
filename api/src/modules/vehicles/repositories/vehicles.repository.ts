import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { QueryVehicleDto } from '../dto/query-vehicle.dto';

@Injectable()
export class VehiclesRepository extends BaseRepository<Vehicle> {
  constructor(
    @InjectRepository(Vehicle)
    repository: Repository<Vehicle>,
  ) {
    super(repository);
  }

  findByVehicleId(vehicleId: string): Promise<Vehicle | null> {
    return this.repository.findOneBy({ vehicleId, isActive: true });
  }

  findWithFilters(query: QueryVehicleDto): Promise<[Vehicle[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Vehicle> = { isActive: true };

    if (query.depot) {
      where.depot = query.depot;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.temp) {
      where.temp = query.temp;
    }

    return this.repository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { vehicleId: 'ASC' },
    });
  }
}
