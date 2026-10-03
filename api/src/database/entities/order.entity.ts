import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { TempRequirement } from '../../common/enums/temp-requirement.enum';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Calendar } from './calendar.entity';
import { Outlet } from './outlet.entity';
import { User } from './user.entity';

/**
 * A store manager's request for one delivery day. A Fresh outlet can hold two
 * orders for the same `requested_date` (ambient and chilled), so the key is
 * the order's own id, never outlet + date.
 */
@Entity('orders')
@Index(['requestedDate', 'status'])
@Index(['outletId', 'requestedDate'])
// An outlet orders each temperature once per delivery day; a cancelled order
// frees the slot again.
@Index(
  'uq_orders_outlet_date_temp',
  ['outletId', 'requestedDate', 'tempRequirement'],
  { unique: true, where: `"status" <> 'cancelled'` },
)
export class Order extends AutoIncBaseEntity {
  @Column({ name: 'outlet_id', type: 'int' })
  outletId: number;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: 'outlet_id' })
  outlet?: Relation<Outlet>;

  @Column({ name: 'placed_by', type: 'int' })
  placedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'placed_by' })
  placedBy?: Relation<User>;

  // The delivery day the store asked for. Demand is counted against this
  // date even when the order is deferred.
  @Column({ name: 'requested_date', type: 'date' })
  requestedDate: string;

  @ManyToOne(() => Calendar)
  @JoinColumn({ name: 'requested_date', referencedColumnName: 'date' })
  requestedDay?: Relation<Calendar>;

  @Column({ name: 'temp_requirement', type: 'enum', enum: TempRequirement })
  tempRequirement: TempRequirement;

  @Column({ name: 'order_units', type: 'int' })
  orderUnits: number;

  @Column({
    name: 'order_weight_kg',
    type: 'decimal',
    precision: 9,
    scale: 2,
    transformer: decimalTransformer,
  })
  orderWeightKg: number;

  @Column({
    name: 'order_volume_m3',
    type: 'decimal',
    precision: 8,
    scale: 3,
    transformer: decimalTransformer,
  })
  orderVolumeM3: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ORDERED })
  status: OrderStatus;

  @Column({ name: 'placed_at', type: 'timestamptz' })
  placedAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  // The store manager's instructions for this delivery.
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
