import { PrimaryGeneratedColumn } from 'typeorm';
import { BaseBaseEntity } from './base-base.entity';

/** The default base for entities: serial primary key plus the audit columns. */
export abstract class AutoIncBaseEntity extends BaseBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
}
