import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { formatPhoneNumber } from '../../common/utils/phone.util';

const DEFAULT_DISPATCHER_PHONE = '0770000000';

/**
 * Creates the first dispatcher, since there is no public registration endpoint —
 * without this there would be no way to authenticate into a fresh database. The
 * dispatcher is the privileged role, so this account can reach everything.
 *
 * The password comes from env and is deliberately not defaulted: a silent
 * fallback password on a deployed instance is worse than a failed boot. The
 * account is identified by its phone number, which is what it logs in with.
 *
 * Every user needs a home depot and this runs before the depots seed, so it
 * creates the default depot itself; the later seed skips the existing row.
 */
export class SeedSystemDispatcher1759000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = process.env.SYSTEM_DISPATCHER_PASSWORD;
    const phone =
      process.env.SYSTEM_DISPATCHER_PHONE || DEFAULT_DISPATCHER_PHONE;

    if (!password) {
      throw new Error(
        'SYSTEM_DISPATCHER_PASSWORD must be set to seed the first dispatcher.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const formattedPhone = formatPhoneNumber(phone);

    await queryRunner.query(
      `INSERT INTO depots (name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING;`,
      [Depot.PELIYAGODA],
    );

    await queryRunner.query(
      `INSERT INTO users (phone, password_hash, first_name, last_name, role, status, depot_id)
       VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM depots WHERE name = $7))
       ON CONFLICT (phone) DO NOTHING;`,
      [
        formattedPhone,
        passwordHash,
        'System',
        'Dispatcher',
        UserRole.DISPATCHER,
        UserStatus.ACTIVE,
        Depot.PELIYAGODA,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const phone =
      process.env.SYSTEM_DISPATCHER_PHONE || DEFAULT_DISPATCHER_PHONE;
    await queryRunner.query(`DELETE FROM users WHERE phone = $1;`, [
      formatPhoneNumber(phone),
    ]);
  }
}
