import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.VEHICLES.VIEW)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query() query: QueryVehicleDto): Promise<ApiResponseDto> {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ApiResponseDto> {
    return this.vehiclesService.findOne(id);
  }
}
