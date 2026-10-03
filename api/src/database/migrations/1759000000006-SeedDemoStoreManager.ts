import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { formatPhoneNumber } from '../../common/utils/phone.util';

const DEFAULT_STORE_MANAGER_PHONE = '0770000001';

// A Fresh outlet at Peliyagoda, so the account can place ambient and chilled orders.
const DEMO_OUTLET = 'OUT001';

/**
 * Creates a store manager already linked to an outlet, so ordering can be
 * tried on a fresh database without first promoting a registered driver on the
 * Team page.
 *
 * Unlike the dispatcher seed this is optional: without
 * `DEMO_STORE_MANAGER_PASSWORD` it does nothing. It runs after the outlets
 * seed, which the outlet link depends on.
 */
export class SeedDemoStoreManager1759000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = process.env.DEMO_STORE_MANAGER_PASSWORD;
    if (!password) {
      return;
    }
    const phone = formatPhoneNumber(
      process.env.DEMO_STORE_MANAGER_PHONE || DEFAULT_STORE_MANAGER_PHONE,
    );

    await queryRunner.query(
      `INSERT INTO users (
         phone, password_hash, first_name, last_name, role, status, depot_id, outlet_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         (SELECT id FROM depots WHERE name = $7),
         (SELECT id FROM outlets WHERE unique_id = $8)
       )
       ON CONFLICT (phone) DO NOTHING;`,
      [
        phone,
        await bcrypt.hash(password, 10),
        'Demo',
        'Store Manager',
        UserRole.STORE_MANAGER,
        UserStatus.ACTIVE,
        Depot.PELIYAGODA,
        DEMO_OUTLET,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE phone = $1;`, [
      formatPhoneNumber(
        process.env.DEMO_STORE_MANAGER_PHONE || DEFAULT_STORE_MANAGER_PHONE,
      ),
    ]);
  }
}
