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
import { QueryOutletDto } from './dto/query-outlet.dto';
import { OutletsService } from './outlets.service';

@Controller('outlets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.OUTLETS.VIEW)
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  findAll(@Query() query: QueryOutletDto): Promise<ApiResponseDto> {
    return this.outletsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ApiResponseDto> {
    return this.outletsService.findOne(id);
  }
}
