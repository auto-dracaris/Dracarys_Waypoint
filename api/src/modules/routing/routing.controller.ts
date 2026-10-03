import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutingService } from './routing.service';

@Controller('routing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER, UserRole.DISPATCHER)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('route')
  route(
    @Body() dto: RouteRequestDto,
    @CurrentUser('userId') userId: number,
  ): Promise<ApiResponseDto> {
    return this.routingService.route(dto, userId);
  }
}
