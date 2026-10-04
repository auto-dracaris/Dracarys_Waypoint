import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { IssueStatus } from '../../common/enums/issue-status.enum';
import { IssueType } from '../../common/enums/issue-type.enum';
import { Image } from './image.entity';
import { Order } from './order.entity';
import { TripStop } from './trip-stop.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

/**
 * A problem raised by a loader (shortfall or damage before departure), a
 * driver (breakdown, delay, trouble at the outlet) or a store manager
 * (shortfall or damage on receipt). The links are all optional because what
 * an issue is about depends on who raised it; `type` says which to expect.
 */
@Entity('issues')
@Index(['status'])
@Index(['tripId'])
@Index(['orderId'])
export class Issue extends UuidBaseEntity {
  @Column({ type: 'enum', enum: IssueType })
  type: IssueType;

  @Column({ type: 'enum', enum: IssueStatus, default: IssueStatus.OPEN })
  status: IssueStatus;

  @Column({ name: 'reported_by', type: 'int', nullable: true })
  reportedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_by' })
  reportedBy?: Relation<User> | null;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip> | null;

  @Column({ name: 'trip_stop_id', type: 'uuid', nullable: true })
  tripStopId: string | null;

  @ManyToOne(() => TripStop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_stop_id' })
  tripStop?: Relation<TripStop> | null;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order?: Relation<Order> | null;

  @Column({ name: 'vehicle_id', type: 'int', nullable: true })
  vehicleId: number | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Relation<Vehicle> | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'affected_units', type: 'int', nullable: true })
  affectedUnits: number | null;

  @Column({ name: 'approved_expected_units', type: 'int', nullable: true })
  approvedExpectedUnits: number | null;

  // The reporter's photo of the problem.
  @Column({ name: 'photo_image_id', type: 'uuid', nullable: true })
  photoImageId: string | null;

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'photo_image_id' })
  photoImage?: Relation<Image> | null;

  // The reporter's device clock, for issues raised offline.
  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'int', nullable: true })
  resolvedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy?: Relation<User> | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;
}
