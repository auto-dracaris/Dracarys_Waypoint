import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PermissionResolutionService } from '../../common/services/permission-resolution.service';
import { UserAuthRepository } from '../auth/repositories/user-auth.repository';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { PermissionsRepository } from './repositories/permissions.repository';
import { UserPermissionsRepository } from './repositories/user-permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly userPermissionsRepository: UserPermissionsRepository,
    private readonly userAuthRepository: UserAuthRepository,
    private readonly permissionResolutionService: PermissionResolutionService,
  ) {}

  /** The catalog a management UI renders its checkbox list from. */
  async findAll(): Promise<ApiResponseDto> {
    const permissions = await this.permissionsRepository.findAll();
    return new ApiResponseDto(
      HttpStatus.OK,
      'Permissions retrieved successfully',
      permissions.map(({ id, title, description }) => ({
        id,
        title,
        description,
      })),
    );
  }

  async findForUser(userId: number): Promise<ApiResponseDto> {
    const user = await this.findUserOrThrow(userId);
    const { effective } = await this.permissionResolutionService.resolveForUser(
      user.id,
      user.role,
    );

    return new ApiResponseDto(
      HttpStatus.OK,
      'User permissions retrieved successfully',
      { userId: user.id, role: user.role, permissions: effective },
    );
  }

  /**
   * Replaces the user's grants wholesale inside one transaction, so a partly
   * applied set can never be left behind.
   */
  async setForUser(
    userId: number,
    dto: SetUserPermissionsDto,
  ): Promise<ApiResponseDto> {
    await this.findUserOrThrow(userId);

    const permissions = await this.permissionsRepository.findByTitles(
      dto.permissions,
    );
    if (permissions.length !== dto.permissions.length) {
      const known = new Set(permissions.map((p) => p.title));
      const unknown = dto.permissions.filter((title) => !known.has(title));
      throw new BadRequestException(
        `Unknown permission(s): ${unknown.join(', ')}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.userPermissionsRepository.deleteByUser(
        userId,
        queryRunner.manager,
      );
      const rows = permissions.map((permission) =>
        this.userPermissionsRepository.create({
          userId,
          permissionId: permission.id,
        }),
      );
      if (rows.length > 0) {
        await this.userPermissionsRepository.save(rows, queryRunner.manager);
      }

      await queryRunner.commitTransaction();
      return new ApiResponseDto(
        HttpStatus.OK,
        'User permissions updated successfully',
        { userId, permissions: permissions.map((p) => p.title) },
      );
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        error.message || 'Could not update the user permissions',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async findUserOrThrow(userId: number) {
    const user = await this.userAuthRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }
}
