import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { OtpPurpose } from '../../modules/auth/enums/otp-purpose.enum';
import { TripStop } from './trip-stop.entity';
import { Trip } from './trip.entity';

/**
 * Stores hashed OTP tokens: account verification (registration, password
 * reset) and the delivery handshakes (confirm dispatch for a trip, confirm
 * delivery for a stop). Hashed with bcrypt so a database dump never exposes
 * live OTPs.
 */
@Entity('otps')
export class UserOtp extends AutoIncBaseEntity {
  // Whose code it is. Null for a trip's codes when nobody stands behind them:
  // a dispatch code for a trip with no driver yet, a delivery code for an
  // outlet with no store manager account.
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'otp_hash', length: 255 })
  otpHash: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.REGISTRATION,
  })
  purpose: OtpPurpose;

  // Set for CONFIRM_DISPATCH and CONFIRM_DELIVERY.
  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip> | null;

  // Set for CONFIRM_DELIVERY: delivery is confirmed per stop, not per trip.
  @Column({ name: 'trip_stop_id', type: 'uuid', nullable: true })
  tripStopId: string | null;

  @ManyToOne(() => TripStop, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_stop_id' })
  tripStop?: Relation<TripStop> | null;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
