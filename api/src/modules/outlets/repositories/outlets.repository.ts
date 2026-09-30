import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Outlet } from '../../../database/entities/outlet.entity';
import { QueryOutletDto } from '../dto/query-outlet.dto';

@Injectable()
export class OutletsRepository extends BaseRepository<Outlet> {
  constructor(
    @InjectRepository(Outlet)
    repository: Repository<Outlet>,
  ) {
    super(repository);
  }

  findByOutletId(outletId: string): Promise<Outlet | null> {
    return this.repository.findOneBy({ outletId, isActive: true });
  }

  findWithFilters(query: QueryOutletDto): Promise<[Outlet[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Outlet> = { isActive: true };

    if (query.brand) {
      where.brand = query.brand;
    }
    if (query.district) {
      where.district = query.district;
    }
    if (query.depot) {
      where.depot = query.depot;
    }
    if (query.dockType) {
      where.dockType = query.dockType;
    }
    if (query.parkingConstraint) {
      where.parkingConstraint = query.parkingConstraint;
    }

    return this.repository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { outletId: 'ASC' },
    });
  }
}
