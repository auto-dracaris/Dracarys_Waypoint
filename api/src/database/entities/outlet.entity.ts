import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { Brand } from '../../common/enums/brand.enum';
import { DockType } from '../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../common/enums/parking-constraint.enum';
import { Depot } from './depot.entity';
import { District } from './district.entity';

@Entity('outlets')
@Index(['depotId'])
@Index(['districtId'])
@Index(['brand'])
export class Outlet extends AutoIncBaseEntity {
  // The dataset's identifier, e.g. OUT001.
  @Column({ name: 'unique_id', type: 'varchar', length: 20, unique: true })
  uniqueId: string;

  // Not in the shared dataset, so nullable until an operator fills it in.
  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @Column({ type: 'enum', enum: Brand })
  brand: Brand;

  @Column({ name: 'district_id', type: 'int' })
  districtId: number;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'district_id' })
  district?: Relation<District>;

  @Column({ name: 'depot_id', type: 'int' })
  depotId: number;

  @ManyToOne(() => Depot)
  @JoinColumn({ name: 'depot_id' })
  depot?: Relation<Depot>;

  @Column({ name: 'dock_type', type: 'enum', enum: DockType })
  dockType: DockType;

  @Column({
    name: 'parking_constraint',
    type: 'enum',
    enum: ParkingConstraint,
    default: ParkingConstraint.NORMAL,
  })
  parkingConstraint: ParkingConstraint;

  // The mall's fixed access window; null for outlets outside malls.
  @Column({ name: 'mall_window_open', type: 'time', nullable: true })
  mallWindowOpen: string | null;

  @Column({ name: 'mall_window_close', type: 'time', nullable: true })
  mallWindowClose: string | null;

  @Column({ name: 'window_open_time', type: 'time' })
  windowOpenTime: string;

  @Column({ name: 'window_close_time', type: 'time' })
  windowCloseTime: string;

  // Dispatcher-controlled: an unavailable outlet is left out of planning.
  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  contactPhone: string | null;
}
