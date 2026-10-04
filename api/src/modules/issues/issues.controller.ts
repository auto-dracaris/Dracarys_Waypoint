import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateIssueDto } from './dto/create-issue.dto';
import { QueryIssueDto } from './dto/query-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { IssuesService } from './issues.service';

// Problems with a delivery, whoever spots them: a loader before departure, a
// driver on the road or at the outlet, a store manager on receipt. They report
// here; the dispatcher reads, acknowledges and resolves.
@Controller('issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @Roles(UserRole.DRIVER, UserRole.LOADER, UserRole.STORE_MANAGER)
  create(
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.issuesService.create(dto, user);
  }

  // No `@Roles`: every signed-in role may read, and the service narrows what
  // callers to their own reports, or a loader's active depot trip.
  @Get()
  findAll(
    @Query() query: QueryIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.issuesService.findAll(query, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.issuesService.findOne(id, user);
  }

  @Patch(':id/acknowledge')
  @Roles(UserRole.DISPATCHER)
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.issuesService.acknowledge(id, user);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.DISPATCHER)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto> {
    return this.issuesService.resolve(id, dto, user);
  }
}
