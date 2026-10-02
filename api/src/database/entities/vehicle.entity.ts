import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { FuelType } from '../../common/enums/fuel-type.enum';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Depot } from './depot.entity';
import { User } from './user.entity';

@Entity('vehicles')
@Index(['depotId'])
@Index(['type'])
@Index(['isRefrigerated'])
export class Vehicle extends AutoIncBaseEntity {
  // The dataset's identifier, e.g. VEH001.
  @Column({ name: 'unique_id', type: 'varchar', length: 20, unique: true })
  uniqueId: string;

  // Not in the shared dataset, so nullable until an operator fills it in.
  @Column({
    name: 'registration_no',
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
  })
  registrationNo: string | null;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  // `temp = reefer` in the dataset. Only these may carry chilled orders.
  @Column({ name: 'is_refrigerated', type: 'boolean', default: false })
  isRefrigerated: boolean;

  @Column({
    name: 'weight_cap_kg',
    type: 'decimal',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  weightCapKg: number;

  @Column({
    name: 'volume_cap_m3',
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: decimalTransformer,
  })
  volumeCapM3: number;

  @Column({
    name: 'fuel_type',
    type: 'enum',
    enum: FuelType,
    default: FuelType.DIESEL,
  })
  fuelType: FuelType;

  @Column({
    name: 'km_per_l',
    type: 'decimal',
    precision: 4,
    scale: 2,
    transformer: decimalTransformer,
  })
  kmPerL: number;

  @Column({
    name: 'weekly_fuel_quota_l',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalTransformer,
  })
  weeklyFuelQuotaL: number;

  @Column({ name: 'driver_id', type: 'int', nullable: true })
  driverId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver?: Relation<User> | null;

  // Home depot: the vehicle serves only this depot's outlets.
  @Column({ name: 'depot_id', type: 'int' })
  depotId: number;

  @ManyToOne(() => Depot)
  @JoinColumn({ name: 'depot_id' })
  depot?: Relation<Depot>;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
  })
  status: VehicleStatus;

  @Column({
    name: 'expected_available_at',
    type: 'timestamptz',
    nullable: true,
  })
  expectedAvailableAt: Date | null;

  // Latest point from `vehicle_locations`, kept here for cheap map reads.
  @Column({
    name: 'last_lat',
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  lastLat: number | null;

  @Column({
    name: 'last_lng',
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  lastLng: number | null;

  @Column({ name: 'last_location_at', type: 'timestamptz', nullable: true })
  lastLocationAt: Date | null;
}
