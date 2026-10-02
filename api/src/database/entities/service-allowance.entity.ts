import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseBaseEntity } from '../../common/entities/base-base.entity';
import { Brand } from '../../common/enums/brand.enum';
import { DockType } from '../../common/enums/dock-type.enum';

/**
 * The dispatcher's handling-time allowance per stop, one row per brand and
 * dock type (`service_allowance.csv`). A planning allowance, not an observed
 * duration.
 */
@Entity('service_allowance')
export class ServiceAllowance extends BaseBaseEntity {
  @PrimaryColumn({ type: 'enum', enum: Brand })
  brand: Brand;

  @PrimaryColumn({ name: 'dock_type', type: 'enum', enum: DockType })
  dockType: DockType;

  @Column({ name: 'service_allowance_min', type: 'int' })
  serviceAllowanceMin: number;
}
