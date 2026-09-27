import { UserRole } from '../../../common/enums/user-role.enum';

/**
 * What `AuthService.issueSession` signs into both tokens. `sid` is the
 * `user_sessions` row id, which is what makes a token revocable.
 */
export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  sid: number;
}
