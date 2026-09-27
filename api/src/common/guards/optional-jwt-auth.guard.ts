import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For routes with both a public and an enriched authenticated view: a bad or
 * missing token leaves the request anonymous instead of failing it.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // anonymous — deliberately swallowed
    }
    return true;
  }

  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    // Passport passes `user: false` (not null/undefined) on failed auth.
    return (user || undefined) as TUser;
  }
}
