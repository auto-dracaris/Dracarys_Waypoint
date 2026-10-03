import { MigrationInterface, QueryRunner } from 'typeorm';
import { readCsvRows } from '../seed-data.util';

// `vehicles.csv` spells refrigeration as `temp`: reefer or ambient.
const REEFER = 'reefer';

/**
 * The dataset's own identifiers (VEH001, OUT001) go into `unique_id`; the
 * primary keys are generated. Depots and districts are linked by name.
 */
export class SeedVehiclesAndOutlets1759000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of readCsvRows('vehicles.csv')) {
      await queryRunner.query(
        `INSERT INTO vehicles (
          unique_id, type, is_refrigerated, weight_cap_kg, volume_cap_m3,
          fuel_type, km_per_l, weekly_fuel_quota_l, depot_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          (SELECT id FROM depots WHERE name = $9)
        )
        ON CONFLICT (unique_id) DO NOTHING;`,
        [
          row.vehicle_id,
          row.type,
          row.temp === REEFER,
          parseFloat(row.weight_cap_kg),
          parseFloat(row.volume_cap_m3),
          row.fuel_type,
          parseFloat(row.km_per_l),
          parseFloat(row.weekly_fuel_quota_l),
          row.depot,
        ],
      );
    }

    for (const row of readCsvRows('outlets.csv')) {
      // `mall_window` is "HH:MM-HH:MM", blank for outlets outside malls.
      const [mallWindowOpen, mallWindowClose] = row.mall_window
        ? row.mall_window.split('-').map((time) => time.trim())
        : [null, null];

      await queryRunner.query(
        `INSERT INTO outlets (
          unique_id, brand, district_id, depot_id, dock_type, parking_constraint,
          mall_window_open, mall_window_close, window_open_time, window_close_time
        ) VALUES (
          $1, $2,
          (SELECT id FROM districts WHERE name = $3),
          (SELECT id FROM depots WHERE name = $4),
          $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (unique_id) DO NOTHING;`,
        [
          row.outlet_id,
          row.brand,
          row.district,
          row.depot,
          row.dock_type,
          row.parking_constraint,
          mallWindowOpen,
          mallWindowClose,
          row.window_open_time,
          row.window_close_time,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM outlets;`);
    await queryRunner.query(`DELETE FROM vehicles;`);
  }
}
