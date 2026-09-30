import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { flattenPermissions } from '../../common/constants/permissions.constant';

export class SeedVehiclesAndOutlets1759000000004 implements MigrationInterface {
  private findDataFile(filename: string): string {
    const candidates = [
      path.join(process.cwd(), 'data', filename),
      path.join(process.cwd(), 'api', 'data', filename),
      path.resolve(__dirname, '../../../../data', filename),
      path.resolve(__dirname, '../../../data', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error(`Cannot find seed data file: ${filename}`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed any newly added permissions
    const titles = flattenPermissions();
    if (titles.length > 0) {
      const values = titles.map((_t, index) => `($${index + 1})`).join(', ');
      await queryRunner.query(
        `INSERT INTO permissions (title) VALUES ${values}
         ON CONFLICT (title) DO NOTHING;`,
        titles,
      );

      // Ensure system dispatcher gets all permissions
      const email = process.env.SYSTEM_DISPATCHER_EMAIL;
      if (email) {
        await queryRunner.query(
          `INSERT INTO user_permissions (user_id, permission_id)
           SELECT u.id, p.id FROM users u CROSS JOIN permissions p
           WHERE u.email = $1
           ON CONFLICT (user_id, permission_id) DO NOTHING;`,
          [email],
        );
      }
    }

    // 2. Seed Vehicles
    const vehiclesFile = this.findDataFile('vehicles.csv');
    const vehiclesContent = fs.readFileSync(vehiclesFile, 'utf8');
    const vehicleLines = vehiclesContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header: vehicle_id,type,temp,weight_cap_kg,volume_cap_m3,fuel_type,km_per_l,weekly_fuel_quota_l,depot
    for (let i = 1; i < vehicleLines.length; i++) {
      const cols = vehicleLines[i].split(',').map((c) => c.trim());
      if (cols.length < 9) continue;
      const [
        vehicleId,
        type,
        temp,
        weightCapKg,
        volumeCapM3,
        fuelType,
        kmPerL,
        weeklyFuelQuotaL,
        depot,
      ] = cols;

      await queryRunner.query(
        `INSERT INTO vehicles (
          vehicle_id, type, temp, weight_cap_kg, volume_cap_m3,
          fuel_type, km_per_l, weekly_fuel_quota_l, depot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (vehicle_id) DO NOTHING;`,
        [
          vehicleId,
          type,
          temp,
          parseInt(weightCapKg, 10),
          parseFloat(volumeCapM3),
          fuelType,
          parseFloat(kmPerL),
          parseInt(weeklyFuelQuotaL, 10),
          depot,
        ],
      );
    }

    // 3. Seed Outlets
    const outletsFile = this.findDataFile('outlets.csv');
    const outletsContent = fs.readFileSync(outletsFile, 'utf8');
    const outletLines = outletsContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header: outlet_id,brand,district,depot,dock_type,parking_constraint,mall_window,window_open_time,window_close_time
    for (let i = 1; i < outletLines.length; i++) {
      const cols = outletLines[i].split(',').map((c) => c.trim());
      if (cols.length < 9) continue;
      const [
        outletId,
        brand,
        district,
        depot,
        dockType,
        parkingConstraint,
        mallWindow,
        windowOpenTime,
        windowCloseTime,
      ] = cols;

      await queryRunner.query(
        `INSERT INTO outlets (
          outlet_id, brand, district, depot, dock_type,
          parking_constraint, mall_window, window_open_time, window_close_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (outlet_id) DO NOTHING;`,
        [
          outletId,
          brand,
          district,
          depot,
          dockType,
          parkingConstraint,
          mallWindow || null,
          windowOpenTime,
          windowCloseTime,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM outlets;`);
    await queryRunner.query(`DELETE FROM vehicles;`);
  }
}
