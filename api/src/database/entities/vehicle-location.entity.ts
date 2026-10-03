import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Trip } from './trip.entity';
import { Vehicle } from './vehicle.entity';

/**
 * Position breadcrumbs from the driver's handset. `recorded_at` is the
 * handset's clock; `received_at` is when the server got the point, which is
 * later for anything captured offline. The latest point is also copied onto
 * `vehicles.last_lat` / `last_lng`.
 */
@Entity('vehicle_locations')
@Index(['vehicleId', 'recordedAt'])
export class VehicleLocation extends UuidBaseEntity {
  @Column({ name: 'vehicle_id', type: 'int' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Relation<Vehicle>;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip> | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    transformer: decimalTransformer,
  })
  lat: number;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    transformer: decimalTransformer,
  })
  lng: number;

  // Degrees clockwise from north, when the handset reports it.
  @Column({ type: 'smallint', nullable: true })
  heading: number | null;

  @Column({
    name: 'speed_kmh',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: decimalTransformer,
  })
  speedKmh: number | null;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt: Date;
}
