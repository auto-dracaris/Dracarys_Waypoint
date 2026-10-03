import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { PatchOutletAvailabilityDto } from './dto/patch-outlet-availability.dto';
import { QueryOutletDto } from './dto/query-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletsService } from './outlets.service';

@Controller('outlets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DISPATCHER)
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Post()
  create(
    @Body() dto: CreateOutletDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.outletsService.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: QueryOutletDto): Promise<ApiResponseDto> {
    return this.outletsService.findAll(query);
  }

  @Get('districts')
  districts(): Promise<ApiResponseDto> {
    return this.outletsService.districts();
  }

  // Declared before `:id`, which would otherwise try to parse "summary".
  @Get('summary')
  summary(): Promise<ApiResponseDto> {
    return this.outletsService.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto> {
    return this.outletsService.findOne(id);
  }

  @Get(':id/overview')
  overview(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto> {
    return this.outletsService.overview(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOutletDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.outletsService.update(id, dto, actorId);
  }

  @Patch(':id/availability')
  updateAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchOutletAvailabilityDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.outletsService.updateAvailability(id, dto, actorId);
  }
}
