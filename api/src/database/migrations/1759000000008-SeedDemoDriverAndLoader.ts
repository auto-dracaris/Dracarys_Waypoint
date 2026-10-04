import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { formatPhoneNumber } from '../../common/utils/phone.util';

const DEFAULT_DRIVER_PHONE = '0770000002';
const DEFAULT_LOADER_PHONE = '0770000003';

/**
 * Creates a driver and a loader at Peliyagoda, so a delivery can be walked
 * through on a fresh database. With the system dispatcher and the demo store
 * manager, that is one account per role.
 *
 * Each is optional: without its password in the environment it is skipped.
 * The driver is put on the first Peliyagoda vehicle that has no driver, which
 * is why this runs after the vehicles seed.
 */
export class SeedDemoDriverAndLoader1759000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const insertUser = `INSERT INTO users (
        phone, password_hash, first_name, last_name, role, status, depot_id
      ) VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM depots WHERE name = $7))
      ON CONFLICT (phone) DO NOTHING;`;

    const driverPassword = process.env.DEMO_DRIVER_PASSWORD;
    if (driverPassword) {
      const phone = formatPhoneNumber(
        process.env.DEMO_DRIVER_PHONE || DEFAULT_DRIVER_PHONE,
      );
      await queryRunner.query(insertUser, [
        phone,
        await bcrypt.hash(driverPassword, 10),
        'Demo',
        'Driver',
        UserRole.DRIVER,
        UserStatus.ACTIVE,
        Depot.PELIYAGODA,
      ]);
      // Only if the driver is not already on a vehicle: `driver_id` is unique.
      await queryRunner.query(
        `UPDATE vehicles SET driver_id = u.id
         FROM users u
         WHERE u.phone = $1
           AND NOT EXISTS (SELECT 1 FROM vehicles taken WHERE taken.driver_id = u.id)
           AND vehicles.id = (
             SELECT v.id FROM vehicles v
             JOIN depots d ON d.id = v.depot_id
             WHERE d.name = $2 AND v.driver_id IS NULL
             ORDER BY v.id LIMIT 1
           );`,
        [phone, Depot.PELIYAGODA],
      );
    }

    const loaderPassword = process.env.DEMO_LOADER_PASSWORD;
    if (loaderPassword) {
      await queryRunner.query(insertUser, [
        formatPhoneNumber(
          process.env.DEMO_LOADER_PHONE || DEFAULT_LOADER_PHONE,
        ),
        await bcrypt.hash(loaderPassword, 10),
        'Demo',
        'Loader',
        UserRole.LOADER,
        UserStatus.ACTIVE,
        Depot.PELIYAGODA,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The vehicle's `driver_id` clears itself: it is ON DELETE SET NULL.
    await queryRunner.query(`DELETE FROM users WHERE phone = ANY($1);`, [
      [
        formatPhoneNumber(
          process.env.DEMO_DRIVER_PHONE || DEFAULT_DRIVER_PHONE,
        ),
        formatPhoneNumber(
          process.env.DEMO_LOADER_PHONE || DEFAULT_LOADER_PHONE,
        ),
      ],
    ]);
  }
}
