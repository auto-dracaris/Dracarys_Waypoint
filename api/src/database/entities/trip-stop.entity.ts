import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { TripStopStatus } from '../../common/enums/trip-stop-status.enum';
import { Order } from './order.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';

/**
 * One order's delivery on a trip — each dispatched order is its own stop.
 * `seq` is the unloading order, which the loader reverses when loading. The
 * unique on it is deferred so stops can be resequenced inside a transaction.
 *
 * The row carries all three lanes after planning: the loader marks it loaded,
 * the driver records the outcome (possibly offline, hence `recorded_at` for
 * the handset's clock and `synced_at` for when the server received it), and
 * the store manager confirms what arrived.
 */
@Entity('trip_stops')
@Unique('uq_trip_stops_trip_seq', ['tripId', 'seq'], {
  deferrable: 'INITIALLY DEFERRED',
})
@Index(['orderId'])
export class TripStop extends UuidBaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order?: Relation<Order>;

  @Column({ type: 'smallint' })
  seq: number;

  @Column({ name: 'planned_arrival_at', type: 'timestamptz' })
  plannedArrivalAt: Date;

  @Column({ name: 'planned_service_min', type: 'int' })
  plannedServiceMin: number;

  // An early vehicle waits for the outlet's window to open.
  @Column({ name: 'planned_wait_min', type: 'int', default: 0 })
  plannedWaitMin: number;

  @Column({
    type: 'enum',
    enum: TripStopStatus,
    default: TripStopStatus.PENDING,
  })
  status: TripStopStatus;

  @Column({ name: 'actual_arrival_at', type: 'timestamptz', nullable: true })
  actualArrivalAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'delivered_units', type: 'int', nullable: true })
  deliveredUnits: number | null;

  // Dispatcher-approved loading quantity; null preserves the original order.
  @Column({ name: 'expected_units', type: 'int', nullable: true })
  expectedUnits: number | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'received_units', type: 'int', nullable: true })
  receivedUnits: number | null;

  @Column({ name: 'receipt_confirmed_at', type: 'timestamptz', nullable: true })
  receiptConfirmedAt: Date | null;

  @Column({ name: 'receipt_confirmed_by', type: 'int', nullable: true })
  receiptConfirmedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receipt_confirmed_by' })
  receiptConfirmedBy?: Relation<User> | null;

  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt: Date | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;
}
