import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanQueryDto } from './dto/plan-query.dto';
import { PlanningService } from './planning.service';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DISPATCHER)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  findPlan(@Query() query: PlanQueryDto): Promise<ApiResponseDto> {
    return this.planningService.findPlan(query);
  }

  @Post('run')
  run(
    @Body() dto: PlanQueryDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.planningService.run(dto, actorId);
  }

  @Post('publish')
  publish(
    @Body() dto: PlanQueryDto,
    @CurrentUser('userId') actorId: number,
  ): Promise<ApiResponseDto> {
    return this.planningService.publish(dto, actorId);
  }
}
