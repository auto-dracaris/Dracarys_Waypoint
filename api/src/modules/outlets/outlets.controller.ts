import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { QueryOutletDto } from './dto/query-outlet.dto';
import { OutletsService } from './outlets.service';

@Controller('outlets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DISPATCHER)
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
