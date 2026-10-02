import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';

/**
 * A distribution point vehicles and outlets belong to. Names are the `Depot`
 * enum values (`src/common/enums/depot.enum.ts`), which is what the seed
 * inserts and what `@IsEnum(Depot)` filters validate against.
 */
@Entity('depots')
export class Depot extends AutoIncBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
}
