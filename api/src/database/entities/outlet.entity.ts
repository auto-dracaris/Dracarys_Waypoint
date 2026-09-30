import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BaseBaseEntity } from '../../common/entities/base-base.entity';
import { Brand } from '../../common/enums/brand.enum';
import { Depot } from '../../common/enums/depot.enum';
import { DockType } from '../../common/enums/dock-type.enum';
import { ParkingConstraint } from '../../common/enums/parking-constraint.enum';

@Entity('outlets')
@Index(['depot'])
@Index(['district'])
@Index(['brand'])
export class Outlet extends BaseBaseEntity {
  @PrimaryColumn({ name: 'outlet_id', type: 'varchar', length: 20 })
  outletId: string;

  @Column({ type: 'enum', enum: Brand })
  brand: Brand;

  @Column({ type: 'varchar', length: 50 })
  district: string;

  @Column({ type: 'enum', enum: Depot })
  depot: Depot;

  @Column({ name: 'dock_type', type: 'enum', enum: DockType })
  dockType: DockType;

  @Column({
    name: 'parking_constraint',
    type: 'enum',
    enum: ParkingConstraint,
    default: ParkingConstraint.NORMAL,
  })
  parkingConstraint: ParkingConstraint;

  @Column({ name: 'mall_window', type: 'varchar', length: 50, nullable: true })
  mallWindow: string | null;

  @Column({ name: 'window_open_time', type: 'time' })
  windowOpenTime: string;

  @Column({ name: 'window_close_time', type: 'time' })
  windowCloseTime: string;
}
