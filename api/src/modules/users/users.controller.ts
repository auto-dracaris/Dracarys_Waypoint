import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatchUserRoleDto } from './dto/patch-user-role.dto';
import { PatchUserStatusDto } from './dto/patch-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DISPATCHER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: UserListQueryDto): Promise<ApiResponseDto> {
    return this.usersService.findAllFiltered(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto> {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.usersService.updateProfile(id, updateUserDto, actorId);
  }

  @Patch(':id/role')
  patchRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchUserRoleDto: PatchUserRoleDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.usersService.patchRole(id, patchUserRoleDto, actorId);
  }

  @Patch(':id/status')
  patchStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchUserStatusDto: PatchUserStatusDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.usersService.patchStatus(id, patchUserStatusDto, actorId);
  }
}
