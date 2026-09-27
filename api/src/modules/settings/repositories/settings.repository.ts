import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SystemSetting } from '../../../database/entities/system-setting.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repository: Repository<SystemSetting>,
  ) {}

  findAll(): Promise<SystemSetting[]> {
    return this.repository.find({ order: { key: 'ASC' } });
  }

  findByKey(key: string): Promise<SystemSetting | null> {
    return this.repository.findOneBy({ key });
  }

  save(
    setting: SystemSetting,
    manager?: EntityManager,
  ): Promise<SystemSetting> {
    return manager ? manager.save(setting) : this.repository.save(setting);
  }
}
