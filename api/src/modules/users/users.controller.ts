import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { PatchUserStatusDto } from './dto/patch-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.USERS.MANAGE)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<ApiResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<ApiResponseDto> {
    return this.usersService.findAll(query.page, query.limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto> {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  patchStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() patchUserStatusDto: PatchUserStatusDto,
  ): Promise<ApiResponseDto> {
    return this.usersService.patchStatus(id, patchUserStatusDto);
  }
}
