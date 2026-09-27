import { Column, Entity, Unique } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/**
 * Permissions are granted directly to a user — no role defaults, no
 * grant/deny override. The presence of a row means "has it"; revoking is
 * deleting the row.
 */
@Entity('user_permissions')
@Unique(['userId', 'permissionId'])
export class UserPermission extends AutoIncBaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'permission_id' })
  permissionId: number;
}
