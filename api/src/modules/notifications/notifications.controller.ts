import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

// Every role has notifications, and each caller only ever reaches their own.
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  findMine(
    @CurrentUser('userId') userId: number,
    @Query() query: NotificationQueryDto,
  ): Promise<ApiResponseDto> {
    return this.notificationsService.findMine(userId, query);
  }

  // Declared before `:id/read`, for the same reason as any fixed path.
  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser('userId') userId: number): Promise<ApiResponseDto> {
    return this.notificationsService.markAllRead(userId);
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.notificationsService.markRead(id, userId);
  }

  // A handset registers its push token after sign-in and removes it at
  // sign-out, so pushes stop for someone who has left the handset.
  @Post('devices')
  @HttpCode(HttpStatus.OK)
  registerDevice(
    @CurrentUser('userId') userId: number,
    @Body() dto: RegisterDeviceDto,
  ): Promise<ApiResponseDto> {
    return this.notificationsService.registerDevice(userId, dto);
  }

  @Delete('devices/:token')
  removeDevice(
    @CurrentUser('userId') userId: number,
    @Param('token') token: string,
  ): Promise<ApiResponseDto> {
    return this.notificationsService.removeDevice(userId, token);
  }
}
