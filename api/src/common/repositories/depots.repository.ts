import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depot } from '../../database/entities/depot.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class DepotsRepository extends BaseRepository<Depot> {
  constructor(@InjectRepository(Depot) repository: Repository<Depot>) {
    super(repository);
  }

  findByName(name: string): Promise<Depot | null> {
    return this.repository.findOneBy({ name });
  }
}
