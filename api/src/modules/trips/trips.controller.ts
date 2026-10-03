import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ArriveStopDto,
  CompleteStopDto,
  DriverActionDto,
  StartTripDto,
} from './dto/driver-action.dto';
import { ResequenceStopsDto } from './dto/resequence-stops.dto';
import { TripListQueryDto } from './dto/trip-list-query.dto';
import { TripsService } from './trips.service';

// Carrying a trip out: the loader loads it, the driver runs it, the
// dispatcher may reorder it. Each route names the roles it is for; the service
// checks the trip is the caller's. A stop's id is its outlet's id.
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @Roles(UserRole.DRIVER, UserRole.LOADER)
  findAll(
    @Query() query: TripListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.findAll(query, user);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER, UserRole.LOADER, UserRole.DISPATCHER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.findOne(id, user);
  }

  @Post(':id/loading/start')
  @Roles(UserRole.LOADER, UserRole.DISPATCHER)
  startLoading(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.startLoading(id, user);
  }

  @Post(':id/loading/complete')
  @Roles(UserRole.LOADER, UserRole.DISPATCHER)
  completeLoading(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.completeLoading(id, user);
  }

  //resend loading code
  @Post(':id/loading/code')
  @Roles(UserRole.LOADER, UserRole.DISPATCHER)
  issueDispatchCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.issueDispatchCode(id, user);
  }

  @Post(':id/start')
  @Roles(UserRole.DRIVER)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.start(id, dto, user);
  }

  @Post(':id/stops/:stopId/arrive')
  @Roles(UserRole.DRIVER)
  arrive(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: ArriveStopDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.arrive(id, stopId, dto, user);
  }

  @Post(':id/stops/:stopId/complete')
  @Roles(UserRole.DRIVER)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: CompleteStopDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.complete(id, stopId, dto, user);
  }

  @Post(':id/stops/:stopId/delivery-code')
  @Roles(UserRole.DRIVER, UserRole.DISPATCHER)
  issueDeliveryCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseIntPipe) stopId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.issueDeliveryCode(id, stopId, user);
  }

  @Patch(':id/stops/sequence')
  @Roles(UserRole.DISPATCHER)
  resequence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResequenceStopsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.resequence(id, dto, user);
  }

  @Get(':id/route-change')
  @Roles(UserRole.DRIVER)
  findRouteChange(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.findRouteChange(id, user);
  }

  @Post(':id/route-change/acknowledge')
  @Roles(UserRole.DRIVER)
  acknowledgeRouteChange(
    @Param('id', ParseUUIDPipe) id: string,
    // Carries the handset's `clientId`; acknowledging twice changes nothing.
    @Body() _dto: DriverActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.tripsService.acknowledgeRouteChange(id, user);
  }
}
