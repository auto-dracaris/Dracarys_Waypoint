import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { QueryVehicleDto } from '../dto/query-vehicle.dto';

// Ids are numeric, so responses carry the depot row for its name.
const VEHICLE_RELATIONS: FindOptionsRelations<Vehicle> = { depot: true };

@Injectable()
export class VehiclesRepository extends BaseRepository<Vehicle> {
  constructor(
    @InjectRepository(Vehicle)
    repository: Repository<Vehicle>,
  ) {
    super(repository);
  }

  findByVehicleId(vehicleId: number): Promise<Vehicle | null> {
    return this.repository.findOne({
      where: { id: vehicleId, isActive: true },
      relations: VEHICLE_RELATIONS,
    });
  }

  findWithFilters(query: QueryVehicleDto): Promise<[Vehicle[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Vehicle> = { isActive: true };

    if (query.uniqueId) {
      where.uniqueId = query.uniqueId;
    }
    if (query.depot) {
      where.depot = { name: query.depot };
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isRefrigerated !== undefined) {
      where.isRefrigerated = query.isRefrigerated;
    }

    return this.repository.findAndCount({
      where,
      relations: VEHICLE_RELATIONS,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });
  }
}
