import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/** Audit trail written by `ActivityInterceptor` for every mutating request. */
@Entity('activities')
export class Activity extends AutoIncBaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  // `type` is explicit because a `string | null` property reflects as `Object`,
  // which TypeORM cannot map to a column on its own.
  @Column({ type: 'varchar', length: 100, nullable: true })
  permission: string | null;

  @Column({ length: 10 })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ name: 'status_code' })
  statusCode: number;
}
