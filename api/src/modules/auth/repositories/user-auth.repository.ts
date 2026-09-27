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

  findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return manager ? manager.save(user) : this.repository.save(user);
  }
}
