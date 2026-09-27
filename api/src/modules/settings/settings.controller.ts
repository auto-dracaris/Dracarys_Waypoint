import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.SETTINGS.MANAGE)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll(): Promise<ApiResponseDto> {
    return this.settingsService.findAll();
  }

  @Get(':key')
  findByKey(@Param('key') key: string): Promise<ApiResponseDto> {
    return this.settingsService.findByKey(key);
  }

  @Put(':key')
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ): Promise<ApiResponseDto> {
    return this.settingsService.update(key, updateSettingDto);
  }
}
