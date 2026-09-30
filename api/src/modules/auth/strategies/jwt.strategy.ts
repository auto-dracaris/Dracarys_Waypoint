import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserAuthRepository } from '../repositories/user-auth.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userSessionRepository: UserSessionRepository,
    private userAuthRepository: UserAuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Stateful checks on top of the signature/expiry check passport-jwt has
    // already done: the session behind this token must still be live, and its
    // owner must not have been blocked or deleted since the token was issued —
    // otherwise a token stays usable until its natural expiry no matter what
    // happens to the account.
    const session = await this.userSessionRepository.findLiveById(payload.sid);
    if (!session) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.userAuthRepository.findById(session.userId);
    if (
      !user ||
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.DELETED
    ) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Role and email come from the row just loaded, not the token, so a role
    // change made by a dispatcher applies on the user's very next request.
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };
  }
}
