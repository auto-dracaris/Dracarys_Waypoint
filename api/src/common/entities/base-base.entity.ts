import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Audit columns shared by every table. Carries no primary key and no
 * identity of its own — pick `AutoIncBaseEntity` or `UuidBaseEntity`
 * depending on the key shape the entity needs.
 */
export abstract class BaseBaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
