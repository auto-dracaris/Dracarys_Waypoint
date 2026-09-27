import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsRepository } from './repositories/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async findAll(): Promise<ApiResponseDto> {
    const settings = await this.settingsRepository.findAll();
    return new ApiResponseDto(
      HttpStatus.OK,
      'Settings retrieved successfully',
      settings.map((setting) => this.toPublic(setting)),
    );
  }

  async findByKey(key: string): Promise<ApiResponseDto> {
    const setting = await this.findOrThrow(key);
    return new ApiResponseDto(
      HttpStatus.OK,
      'Setting retrieved successfully',
      this.toPublic(setting),
    );
  }

  /**
   * Only `value` is updatable. Keys and types come from
   * `DEFAULT_SETTINGS` and change by migration, so the code reading a setting
   * can rely on its type.
   */
  async update(key: string, dto: UpdateSettingDto): Promise<ApiResponseDto> {
    const setting = await this.findOrThrow(key);
    setting.value = dto.value;
    const saved = await this.settingsRepository.save(setting);

    return new ApiResponseDto(
      HttpStatus.OK,
      'Setting updated successfully',
      this.toPublic(saved),
    );
  }

  private async findOrThrow(key: string): Promise<SystemSetting> {
    const setting = await this.settingsRepository.findByKey(key);
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  private toPublic(setting: SystemSetting) {
    const { key, value, type, description } = setting;
    return { key, value, type, description };
  }
}
