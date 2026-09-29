import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
// Type-only on purpose: `User` extends this class too, so a runtime import
// would be circular and crash whichever entity loads first. The relations
// below name their target as the string 'User' (resolved by TypeORM from the
// entity's class name) so nothing here needs the class at load time.
import type { User } from '../../database/entities/user.entity';

/**
 * Audit columns shared by every table. Carries no primary key and no
 * identity of its own — pick `AutoIncBaseEntity` or `UuidBaseEntity`
 * depending on the key shape the entity needs.
 *
 * `created_by` / `updated_by` are foreign keys to `users`. Code sets the
 * `*Id` columns; the relations are not eager, so load them explicitly when a
 * response needs the user (and strip its `passwordHash` if you do).
 */
export abstract class BaseBaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: Relation<User> | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedById: number | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: Relation<User> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
