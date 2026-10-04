import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { NotificationSeverity } from '../../common/enums/notification-severity.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { User } from './user.entity';

/**
 * Something one user is told about: a trip assigned, an order deferred, an
 * issue raised. One row per recipient, so each reads it on their own. The
 * wording is fixed when the row is written; `data` holds the ids a client
 * needs to open the thing it is about.
 */
@Entity('notifications')
@Index(['userId', 'sentAt'])
export class Notification extends UuidBaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationSeverity })
  severity: NotificationSeverity;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  // tripId, orderId, issueId, date: whichever the type is about.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  data: Record<string, string>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  // When it was sent, for "5 min ago". Kept beside the inherited
  // `created_at` because that column has no time zone and reads back shifted.
  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'now()' })
  sentAt: Date;
}
