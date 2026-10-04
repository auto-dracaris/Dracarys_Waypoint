import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';
import { readCsvRows } from '../seed-data.util';

/**
 * Depots come from the `Depot` enum (their names are its values); districts
 * come from `district_travel.csv`. Both must exist before vehicles and
 * outlets, which reference them. Ids are generated, so rows are matched and
 * linked by name.
 */
export class SeedDepotsAndDistricts1759000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const depot of Object.values(Depot)) {
      await queryRunner.query(
        `INSERT INTO depots (name) VALUES ($1)
         ON CONFLICT (name) DO NOTHING;`,
        [depot],
      );
    }

    for (const row of readCsvRows('district_travel.csv')) {
      await queryRunner.query(
        `INSERT INTO districts (
          name, depot_id, road_class, free_flow_kmh, depot_to_district_km,
          depot_to_district_freeflow_min, inter_stop_km, inter_stop_freeflow_min
        ) VALUES (
          $1, (SELECT id FROM depots WHERE name = $2), $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (name) DO NOTHING;`,
        [
          row.district,
          row.depot,
          row.road_class,
          parseFloat(row.free_flow_kmh),
          parseFloat(row.depot_to_district_km),
          parseInt(row.depot_to_district_freeflow_min, 10),
          parseFloat(row.inter_stop_km),
          parseInt(row.inter_stop_freeflow_min, 10),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM districts;`);
    await queryRunner.query(`DELETE FROM depots;`);
  }
}
