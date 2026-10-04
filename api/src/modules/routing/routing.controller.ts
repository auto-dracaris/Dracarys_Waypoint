import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('route')
  @UseGuards(OptionalJwtAuthGuard)
  route(
    @Body() dto: RouteRequestDto,
    @CurrentUser('userId') userId?: number,
  ): Promise<ApiResponseDto> {
    return this.routingService.route(dto, userId);
  }
}
