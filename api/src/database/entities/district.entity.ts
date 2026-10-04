import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { RoadClass } from '../../common/enums/road-class.enum';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Depot } from './depot.entity';

/**
 * A district and its clear-road travel figures (`district_travel.csv`).
 * `name` is the district as the dataset spells it. Each district is served by
 * exactly one depot.
 */
@Entity('districts')
@Index(['depotId'])
export class District extends AutoIncBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'depot_id', type: 'int' })
  depotId: number;

  @ManyToOne(() => Depot)
  @JoinColumn({ name: 'depot_id' })
  depot?: Relation<Depot>;

  @Column({ name: 'road_class', type: 'enum', enum: RoadClass })
  roadClass: RoadClass;

  @Column({
    name: 'free_flow_kmh',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  freeFlowKmh: number;

  @Column({
    name: 'depot_to_district_km',
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: decimalTransformer,
  })
  depotToDistrictKm: number;

  @Column({ name: 'depot_to_district_freeflow_min', type: 'int' })
  depotToDistrictFreeflowMin: number;

  @Column({
    name: 'inter_stop_km',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  interStopKm: number;

  @Column({ name: 'inter_stop_freeflow_min', type: 'int' })
  interStopFreeflowMin: number;
}
