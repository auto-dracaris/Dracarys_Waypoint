import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../../../database/entities/permission.entity';

@Injectable()
export class PermissionsRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repository: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.repository.find({ order: { title: 'ASC' } });
  }

  findByTitles(titles: string[]): Promise<Permission[]> {
    return this.repository.findBy({ title: In(titles) });
  }
}
