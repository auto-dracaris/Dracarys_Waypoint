import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Outlet } from '../../../database/entities/outlet.entity';
import { QueryOutletDto } from '../dto/query-outlet.dto';

// Ids are numeric, so responses carry the related rows for their names.
const OUTLET_RELATIONS: FindOptionsRelations<Outlet> = {
  district: true,
  depot: true,
};

@Injectable()
export class OutletsRepository extends BaseRepository<Outlet> {
  constructor(
    @InjectRepository(Outlet)
    repository: Repository<Outlet>,
  ) {
    super(repository);
  }

  findByOutletId(outletId: number): Promise<Outlet | null> {
    return this.repository.findOne({
      where: { id: outletId, isActive: true },
      relations: OUTLET_RELATIONS,
    });
  }

  findWithFilters(query: QueryOutletDto): Promise<[Outlet[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Outlet> = { isActive: true };

    if (query.uniqueId) {
      where.uniqueId = query.uniqueId;
    }
    if (query.brand) {
      where.brand = query.brand;
    }
    if (query.district) {
      where.district = { name: query.district };
    }
    if (query.depot) {
      where.depot = { name: query.depot };
    }
    if (query.dockType) {
      where.dockType = query.dockType;
    }
    if (query.parkingConstraint) {
      where.parkingConstraint = query.parkingConstraint;
    }

    return this.repository.findAndCount({
      where,
      relations: OUTLET_RELATIONS,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });
  }
}
