import { PrimaryGeneratedColumn } from 'typeorm';
import { BaseBaseEntity } from './base-base.entity';

/**
 * Same as `AutoIncBaseEntity` but with a UUID key. Use it where an id is
 * exposed to a client that must not be able to enumerate rows, or where ids
 * are minted offline (driver handsets) and merged on sync.
 */
export abstract class UuidBaseEntity extends BaseBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
