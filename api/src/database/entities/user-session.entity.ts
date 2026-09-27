import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/**
 * The stateful half of auth. A signed access token is only honoured while the
 * session it was issued under is still live, which is what makes logout and
 * forced revocation take effect before the token's natural expiry.
 *
 * The refresh token is stored as a bcrypt hash — a leaked table gives an
 * attacker nothing to present back to us.
 */
@Entity('user_sessions')
export class UserSession extends AutoIncBaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'refresh_token_hash', length: 255 })
  refreshTokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;
}
