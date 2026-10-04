import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { DeferralReason } from '../../common/enums/deferral-reason.enum';
import { Order } from './order.entity';

/**
 * The record of an order being left off a run. One row per order per
 * `plan_date`, so repeated deferrals of the same order (and, through the
 * order, the same outlet) stay visible. The dispatcher who deferred it is the
 * inherited `created_by`.
 */
@Entity('order_deferrals')
@Unique(['orderId', 'planDate'])
@Index(['planDate'])
export class OrderDeferral extends UuidBaseEntity {
  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Relation<Order>;

  // The run the order was left off.
  @Column({ name: 'plan_date', type: 'date' })
  planDate: string;

  @Column({ type: 'enum', enum: DeferralReason })
  reason: DeferralReason;

  @Column({ name: 'reason_note', type: 'text', nullable: true })
  reasonNote: string | null;

  // The run it was moved to, once known.
  @Column({ name: 'deferred_to_date', type: 'date', nullable: true })
  deferredToDate: string | null;
}
