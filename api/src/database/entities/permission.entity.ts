import { Column, Entity, Unique } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/**
 * One row per string in `PERMISSIONS` (see
 * `src/common/constants/permissions.constant.ts`), seeded by migration.
 */
@Entity('permissions')
@Unique(['title'])
export class Permission extends AutoIncBaseEntity {
  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
