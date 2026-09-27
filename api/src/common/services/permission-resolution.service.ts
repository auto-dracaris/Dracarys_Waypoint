import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../../database/entities/permission.entity';
import { UserPermission } from '../../database/entities/user-permission.entity';
import { UserRole } from '../enums/user-role.enum';

export interface EffectivePermissions {
  effective: string[];
}

/**
 * Resolves what a user is actually allowed to do. Permissions are assigned
 * directly to a user — no role defaults, no grant/deny override. The only
 * special case is DISPATCHER, the privileged operator, which bypasses this
 * entirely.
 */
@Injectable()
export class PermissionResolutionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
  ) {}

  async resolveForUser(
    userId: number,
    role: UserRole,
  ): Promise<EffectivePermissions> {
    if (role === UserRole.DISPATCHER) {
      const all = await this.permissionRepository.find();
      return { effective: all.map((p) => p.title) };
    }
    return { effective: await this.grantedTitles(userId) };
  }

  async hasAny(
    userId: number,
    role: UserRole,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (role === UserRole.DISPATCHER) {
      return true;
    }
    const { effective } = await this.resolveForUser(userId, role);
    return requiredPermissions.some((p) => effective.includes(p));
  }

  private async grantedTitles(userId: number): Promise<string[]> {
    const grants = await this.userPermissionRepository.find({
      where: { userId },
    });
    if (grants.length === 0) {
      return [];
    }
    const permissions = await this.permissionRepository.find({
      where: { id: In(grants.map((g) => g.permissionId)) },
    });
    return permissions.map((p) => p.title);
  }
}
