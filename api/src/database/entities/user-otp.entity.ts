import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { OtpPurpose } from '../../modules/auth/enums/otp-purpose.enum';

/**
 * Stores hashed OTP tokens for verification (registration, password reset).
 * Hashed with bcrypt so a database dump never exposes live OTPs.
 */
@Entity('otps')
export class UserOtp extends AutoIncBaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'otp_hash', length: 255 })
  otpHash: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.REGISTRATION,
  })
  purpose: OtpPurpose;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
