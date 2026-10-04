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
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeferOrderDto } from './dto/defer-order.dto';
import { OrderDateQueryDto } from './dto/order-date-query.dto';
import { QueryMyOrderDto } from './dto/query-my-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrdersService } from './orders.service';

// Store managers place and follow their own outlet's orders; dispatchers see
// every outlet's. Each route names the role it is for.
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.STORE_MANAGER)
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.ordersService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.DISPATCHER)
  findAll(@Query() query: QueryOrderDto): Promise<ApiResponseDto> {
    return this.ordersService.findAll(query);
  }

  // The fixed paths are declared before `:id`, which would otherwise try to
  // parse them as an order id.
  @Get('placement-options')
  @Roles(UserRole.STORE_MANAGER)
  placementOptions(
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.ordersService.placementOptions(userId);
  }

  @Get('my')
  @Roles(UserRole.STORE_MANAGER)
  findMine(
    @Query() query: QueryMyOrderDto,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.ordersService.findMine(query, userId);
  }

  @Get('summary')
  @Roles(UserRole.DISPATCHER)
  summary(@Query() query: OrderDateQueryDto): Promise<ApiResponseDto> {
    return this.ordersService.summary(query);
  }

  @Get(':id')
  @Roles(UserRole.STORE_MANAGER, UserRole.DISPATCHER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.STORE_MANAGER)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.ordersService.cancel(id, userId);
  }

  @Patch(':id/defer')
  @Roles(UserRole.DISPATCHER)
  defer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeferOrderDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.ordersService.defer(id, dto, actorId);
  }
}
