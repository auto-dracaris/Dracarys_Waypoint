import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DevicePlatform } from '../../../common/enums/device-platform.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserDevice } from '../../../database/entities/user-device.entity';

@Injectable()
export class UserDevicesRepository extends BaseRepository<UserDevice> {
  constructor(
    @InjectRepository(UserDevice)
    repository: Repository<UserDevice>,
  ) {
    super(repository);
  }

  /** Stores the token for this user, taking it over from whoever had it. */
  async register(
    userId: number,
    token: string,
    platform: DevicePlatform,
  ): Promise<void> {
    await this.repository.upsert(
      { userId, token, platform, createdById: userId, updatedById: userId },
      ['token'],
    );
  }

  async removeOwn(userId: number, token: string): Promise<void> {
    await this.repository.delete({ userId, token });
  }

  findOfUsers(userIds: number[]): Promise<UserDevice[]> {
    if (!userIds.length) {
      return Promise.resolve([]);
    }
    return this.repository.findBy({ userId: In(userIds) });
  }

  async removeTokens(tokens: string[]): Promise<void> {
    if (tokens.length) {
      await this.repository.delete({ token: In(tokens) });
    }
  }
}
