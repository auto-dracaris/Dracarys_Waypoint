import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class UserAuthRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOneBy({ phone });
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  create(data: import('typeorm').DeepPartial<User>): User {
    return this.repository.create(data);
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return manager ? manager.save(user) : this.repository.save(user);
  }
}
