import { Column, Entity, Unique } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/**
 * Runtime configuration that operators change without a deploy — cutoff time,
 * loading deadline, auto-accept rules. Secrets and connection details stay in
 * env, read via ConfigService.
 */
@Entity('system_settings')
@Unique(['key'])
export class SystemSetting extends AutoIncBaseEntity {
  @Column({ length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ length: 20, default: 'string' })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
