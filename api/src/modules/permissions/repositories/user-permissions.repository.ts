import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { UserPermission } from '../../../database/entities/user-permission.entity';

@Injectable()
export class UserPermissionsRepository {
  constructor(
    @InjectRepository(UserPermission)
    private readonly repository: Repository<UserPermission>,
  ) {}

  findByUser(userId: number): Promise<UserPermission[]> {
    return this.repository.findBy({ userId });
  }

  create(data: DeepPartial<UserPermission>): UserPermission {
    return this.repository.create(data);
  }

  save(
    rows: UserPermission[],
    manager?: EntityManager,
  ): Promise<UserPermission[]> {
    return manager ? manager.save(rows) : this.repository.save(rows);
  }

  async deleteByUser(userId: number, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.delete(UserPermission, { userId });
      return;
    }
    await this.repository.delete({ userId });
  }
}
