import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { DevicePlatform } from '../../common/enums/device-platform.enum';
import { User } from './user.entity';

/**
 * A handset that gets a user's push notifications, by its Firebase token. A
 * token belongs to one user at a time: signing in on the handset as someone
 * else moves it.
 */
@Entity('user_devices')
@Index(['userId'])
export class UserDevice extends AutoIncBaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;
}
