import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliveryIssueDto, DeliveryProofDto } from './dto/record.dto';
import { TripRecordsService } from './trip-records.service';

// What the driver puts on record at a stop. A signature or photo is uploaded
// first with `POST /images` and named here by its id.
@Controller('trips/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripRecordsController {
  constructor(private readonly recordsService: TripRecordsService) {}

  @Post('stops/:stopId/proof')
  @Roles(UserRole.DRIVER)
  addProof(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: DeliveryProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.recordsService.addProof(id, stopId, dto, user);
  }

  @Post('stops/:stopId/orders/:orderId/issues')
  @Roles(UserRole.DRIVER)
  addIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseIntPipe) stopId: number,
    // An order reference, e.g. ORD0000012.
    @Param('orderId') orderId: string,
    @Body() dto: DeliveryIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.recordsService.addIssue(id, stopId, orderId, dto, user);
  }

  @Get('records')
  @Roles(UserRole.DRIVER, UserRole.DISPATCHER)
  findRecords(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.recordsService.findRecords(id, query, user);
  }
}
