import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';

/** One stop as it stood before or after a reorder. */
export interface RouteChangeStop {
  name: string;
  area: string;
  completed: boolean;
  // How the stop moved in the new order compared with the old one.
  movement: 'none' | 'up' | 'down';
}

/**
 * A dispatcher's reorder of a trip's stops after the plan was published. The
 * before and after are kept as snapshots, so the driver can be shown exactly
 * what changed and the record survives later reorders. The dispatcher who
 * made it is the inherited `created_by`.
 */
@Entity('route_changes')
@Index(['tripId', 'planVersion'])
export class RouteChange extends UuidBaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  // The trip's plan version this change produced.
  @Column({ name: 'plan_version', type: 'int' })
  planVersion: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb' })
  previous: RouteChangeStop[];

  @Column({ type: 'jsonb' })
  updated: RouteChangeStop[];

  // The stop whose arrival moved the most, with its arrival before and after.
  @Column({ name: 'impact_stop_name', type: 'varchar', length: 150 })
  impactStopName: string;

  @Column({ name: 'impact_arrival_was', type: 'timestamptz' })
  impactArrivalWas: Date;

  @Column({ name: 'impact_arrival_now', type: 'timestamptz' })
  impactArrivalNow: Date;

  // Set when that stop is now reached close to its window closing.
  @Column({
    name: 'tight_window',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tightWindow: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'acknowledged_by', type: 'int', nullable: true })
  acknowledgedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledgedBy?: Relation<User> | null;
}
