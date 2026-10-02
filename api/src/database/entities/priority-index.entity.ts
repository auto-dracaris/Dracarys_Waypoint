import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { PriorityIndexStatus } from '../../common/enums/priority-index-status.enum';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Order } from './order.entity';

/**
 * The score an order was given for one planning run, with the factors behind
 * it, so an allocation or deferral can be explained afterwards. A deferred
 * order is scored again on the next run, hence one row per order per
 * `plan_date`.
 */
@Entity('priority_index')
@Unique(['orderId', 'planDate'])
export class PriorityIndex extends UuidBaseEntity {
  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Relation<Order>;

  @Column({ name: 'plan_date', type: 'date' })
  planDate: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  score: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  factors: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: PriorityIndexStatus,
    default: PriorityIndexStatus.PENDING,
  })
  status: PriorityIndexStatus;

  @Column({ type: 'text', nullable: true })
  remark: string | null;
}
