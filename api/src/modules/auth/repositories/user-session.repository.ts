import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  EntityManager,
  IsNull,
  LessThan,
  Repository,
} from 'typeorm';
import { UserSession } from '../../../database/entities/user-session.entity';

@Injectable()
export class UserSessionRepository {
  constructor(
    @InjectRepository(UserSession)
    private readonly repository: Repository<UserSession>,
  ) {}

  /** A session is live only while it is un-revoked and unexpired. */
  async findLiveById(id: number): Promise<UserSession | null> {
    const session = await this.repository.findOneBy({
      id,
      revokedAt: IsNull(),
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return session;
  }

  create(data: DeepPartial<UserSession>): UserSession {
    return this.repository.create(data);
  }

  save(session: UserSession, manager?: EntityManager): Promise<UserSession> {
    return manager ? manager.save(session) : this.repository.save(session);
  }

  /** Housekeeping: drop sessions that can no longer authenticate anything. */
  async purgeExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
