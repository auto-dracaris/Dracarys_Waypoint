import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { UserRole } from '../../common/enums/user-role.enum';

/** Audit trail written by `ActivityInterceptor` for every mutating request. */
@Entity('activities')
export class Activity extends AutoIncBaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  // The caller's role at the time of the request. Nullable only for rows
  // written before roles replaced permissions.
  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role: UserRole | null;

  @Column({ length: 10 })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ name: 'status_code' })
  statusCode: number;
}
