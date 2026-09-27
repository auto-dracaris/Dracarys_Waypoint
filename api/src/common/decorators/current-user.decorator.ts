import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
  // The live `user_sessions` row this request's access token was issued
  // under — set by JwtStrategy.validate() once it has confirmed the session
  // is not revoked. Used by logout to revoke exactly this session.
  sessionId: number;
}

/**
 * Reads the JWT-derived user set by JwtStrategy.validate() onto `req.user`.
 * Use instead of `@Req() req: any` + `req.user.userId`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
