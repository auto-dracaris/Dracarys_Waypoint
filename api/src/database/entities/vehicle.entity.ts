import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BaseBaseEntity } from '../../common/entities/base-base.entity';
import { Depot } from '../../common/enums/depot.enum';
import { VehicleTemp } from '../../common/enums/vehicle-temp.enum';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

@Entity('vehicles')
@Index(['depot'])
@Index(['type'])
@Index(['temp'])
export class Vehicle extends BaseBaseEntity {
  @PrimaryColumn({ name: 'vehicle_id', type: 'varchar', length: 20 })
  vehicleId: string;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  @Column({ type: 'enum', enum: VehicleTemp })
  temp: VehicleTemp;

  @Column({ name: 'weight_cap_kg', type: 'int' })
  weightCapKg: number;

  @Column({
    name: 'volume_cap_m3',
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : value),
    },
  })
  volumeCapM3: number;

  @Column({ name: 'fuel_type', type: 'varchar', length: 30, default: 'diesel' })
  fuelType: string;

  @Column({
    name: 'km_per_l',
    type: 'decimal',
    precision: 4,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value ? parseFloat(value) : value),
    },
  })
  kmPerL: number;

  @Column({ name: 'weekly_fuel_quota_l', type: 'int' })
  weeklyFuelQuotaL: number;

  @Column({ type: 'enum', enum: Depot })
  depot: Depot;
}
