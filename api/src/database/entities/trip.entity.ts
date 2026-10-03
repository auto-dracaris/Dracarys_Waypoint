import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UuidBaseEntity } from '../../common/entities/uuid-base.entity';
import { Brand } from '../../common/enums/brand.enum';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Depot } from './depot.entity';
import { District } from './district.entity';
import { TripStop } from './trip-stop.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

/**
 * One vehicle run: leaves its depot, serves one brand in one district, and
 * returns. A vehicle runs at most two a day, which the `trip_no` check and
 * the partial unique index enforce (a cancelled trip frees its slot).
 */
@Entity('trips')
@Check('chk_trips_trip_no', '"trip_no" IN (1, 2)')
@Index('uq_trips_vehicle_date_no', ['vehicleId', 'serviceDate', 'tripNo'], {
  unique: true,
  where: `"status" <> 'cancelled'`,
})
@Index(['depotId', 'serviceDate'])
export class Trip extends UuidBaseEntity {
  @Column({ name: 'depot_id', type: 'int' })
  depotId: number;

  @ManyToOne(() => Depot)
  @JoinColumn({ name: 'depot_id' })
  depot?: Relation<Depot>;

  @Column({ name: 'vehicle_id', type: 'int' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.trips)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Relation<Vehicle>;

  // Snapshot of who drove, since `vehicles.driver_id` can change later.
  @Column({ name: 'driver_id', type: 'int', nullable: true })
  driverId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver?: Relation<User> | null;

  @Column({ type: 'enum', enum: Brand })
  brand: Brand;

  @Column({ name: 'district_id', type: 'int' })
  districtId: number;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'district_id' })
  district?: Relation<District>;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate: string;

  @Column({ name: 'trip_no', type: 'smallint' })
  tripNo: number;

  @Column({ name: 'planned_depart_at', type: 'timestamptz' })
  plannedDepartAt: Date;

  @Column({ name: 'planned_minutes', type: 'int' })
  plannedMinutes: number;

  @Column({
    name: 'planned_km',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalTransformer,
  })
  plannedKm: number;

  // Counts against the vehicle's weekly fuel quota.
  @Column({
    name: 'planned_fuel_l',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalTransformer,
  })
  plannedFuelL: number;

  @Column({
    name: 'total_weight_kg',
    type: 'decimal',
    precision: 9,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalWeightKg: number;

  @Column({
    name: 'total_volume_m3',
    type: 'decimal',
    precision: 8,
    scale: 3,
    transformer: decimalTransformer,
  })
  totalVolumeM3: number;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.DRAFT })
  status: TripStatus;

  @Column({ name: 'actual_depart_at', type: 'timestamptz', nullable: true })
  actualDepartAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => TripStop, (stop) => stop.trip)
  stops?: Relation<TripStop[]>;
}
