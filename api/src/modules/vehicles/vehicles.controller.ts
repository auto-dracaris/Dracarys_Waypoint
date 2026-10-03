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
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { LocationBatchDto } from './dto/location-batch.dto';
import { PatchVehicleStatusDto } from './dto/patch-vehicle-status.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehicleDateQueryDto } from './dto/vehicle-date-query.dto';
import { VehicleSummaryQueryDto } from './dto/vehicle-summary-query.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DISPATCHER)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.vehiclesService.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: QueryVehicleDto): Promise<ApiResponseDto> {
    return this.vehiclesService.findAll(query);
  }

  // Declared before `:id`, which would otherwise try to parse "summary".
  @Get('summary')
  summary(@Query() query: VehicleSummaryQueryDto): Promise<ApiResponseDto> {
    return this.vehiclesService.summary(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: VehicleDateQueryDto,
  ): Promise<ApiResponseDto> {
    return this.vehiclesService.findOne(id, query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchVehicleStatusDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.vehiclesService.updateStatus(id, dto, actorId);
  }

  // The one route here for drivers: it overrides the class's dispatcher-only
  // rule, and the service checks the vehicle is the caller's.
  @Post(':id/locations')
  @Roles(UserRole.DRIVER)
  addLocations(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LocationBatchDto,
    @CurrentUser('userId') driverId: number,
  ): Promise<ApiResponseDto> {
    return this.vehiclesService.addLocations(id, dto, driverId);
  }

  @Patch(':id/driver')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDriverDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.vehiclesService.assignDriver(id, dto, actorId);
  }
}
