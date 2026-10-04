import { Column, Entity } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { decimalTransformer } from '../../common/utils/decimal.transformer';

/**
 * A distribution point vehicles and outlets belong to. Names are the `Depot`
 * enum values (`src/common/enums/depot.enum.ts`), which is what the seed
 * inserts and what `@IsEnum(Depot)` filters validate against.
 */
@Entity('depots')
export class Depot extends AutoIncBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  // Where it is on the map. Not in the shared dataset, so seeded approximately
  // and nullable until someone corrects it.
  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  lat: number | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  lng: number | null;
}
