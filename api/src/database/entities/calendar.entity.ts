import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseBaseEntity } from '../../common/entities/base-base.entity';
import { decimalTransformer } from '../../common/utils/decimal.transformer';

/** One row per calendar date (`calendar.csv`). `dow` 0 is Monday. */
@Entity('calendar')
export class Calendar extends BaseBaseEntity {
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'smallint' })
  dow: number;

  @Column({ name: 'iso_year', type: 'smallint' })
  isoYear: number;

  @Column({ name: 'iso_week', type: 'smallint' })
  isoWeek: number;

  @Column({ name: 'is_payday', type: 'boolean', default: false })
  isPayday: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  festival: string | null;

  // Proximity to a festival: 0 away from it, rising to 1 on the festival date.
  @Column({
    name: 'festival_ramp',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  festivalRamp: number;

  @Column({ name: 'is_holiday', type: 'boolean', default: false })
  isHoliday: boolean;

  @Column({ type: 'boolean', default: false })
  monsoon: boolean;

  @Column({ name: 'is_operating', type: 'boolean', default: true })
  isOperating: boolean;
}
