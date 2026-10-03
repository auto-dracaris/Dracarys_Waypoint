import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserOtp } from '../../../database/entities/user-otp.entity';

@Injectable()
export class UserOtpRepository extends BaseRepository<UserOtp> {
  constructor(
    @InjectRepository(UserOtp)
    repository: Repository<UserOtp>,
  ) {
    super(repository);
  }

  /** A user's code for one purpose; issuing a new one replaces the old, so there is at most one. */
  findByUserIdAndPurpose(
    userId: number,
    purpose: UserOtp['purpose'],
  ): Promise<UserOtp | null> {
    return this.repository.findOneBy({ userId, purpose });
  }

  async deleteById(id: number, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.delete(UserOtp, { id });
      return;
    }
    await this.repository.delete({ id });
  }

  /** Delete any OTPs belonging to a user for a given purpose before issuing a new one */
  async deleteByUserIdAndPurpose(
    userId: number,
    purpose: UserOtp['purpose'],
    manager?: EntityManager,
  ): Promise<void> {
    if (manager) {
      await manager.delete(UserOtp, { userId, purpose });
      return;
    }
    await this.repository.delete({ userId, purpose });
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
