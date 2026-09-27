import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.PERMISSIONS.MANAGE)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll(): Promise<ApiResponseDto> {
    return this.permissionsService.findAll();
  }

  @Get('users/:userId')
  findForUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponseDto> {
    return this.permissionsService.findForUser(userId);
  }

  @Put('users/:userId')
  setForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() setUserPermissionsDto: SetUserPermissionsDto,
  ): Promise<ApiResponseDto> {
    return this.permissionsService.setForUser(userId, setUserPermissionsDto);
  }
}
