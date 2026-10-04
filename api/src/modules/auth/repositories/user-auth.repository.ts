import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';

@Injectable()
export class UserAuthRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  // Both carry the avatar image, so a response can give its URL.
  findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOne({
      where: { phone },
      relations: { avatarImage: true },
    });
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: { avatarImage: true },
    });
  }

  /** The vehicle a driver is assigned to; a driver is on one vehicle at a time. */
  findVehicleOfDriver(driverId: number): Promise<Vehicle | null> {
    return this.repository.manager
      .getRepository(Vehicle)
      .findOneBy({ driverId, isActive: true });
  }

  create(data: import('typeorm').DeepPartial<User>): User {
    return this.repository.create(data);
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return manager ? manager.save(user) : this.repository.save(user);
  }
}
