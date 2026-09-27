import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../../modules/auth/decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PermissionResolutionService } from '../services/permission-resolution.service';

/**
 * Multiple permissions on one route are OR, not AND:
 * `@Permissions(A, B)` passes if the caller holds either.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionResolutionService: PermissionResolutionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    return this.permissionResolutionService.hasAny(
      user.userId,
      user.role,
      requiredPermissions,
    );
  }
}
