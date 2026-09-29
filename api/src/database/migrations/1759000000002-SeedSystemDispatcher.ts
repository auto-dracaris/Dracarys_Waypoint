import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { formatPhoneNumber } from '../../common/utils/phone.util';

/**
 * Creates the first dispatcher, since there is no public registration endpoint —
 * without this there would be no way to authenticate into a fresh database. The
 * dispatcher is the privileged role, so this account can reach everything.
 *
 * Credentials come from env and are deliberately not defaulted: a silent
 * fallback password on a deployed instance is worse than a failed boot.
 */
export class SeedSystemDispatcher1759000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.SYSTEM_DISPATCHER_EMAIL;
    const password = process.env.SYSTEM_DISPATCHER_PASSWORD;
    const phone = process.env.SYSTEM_DISPATCHER_PHONE || '0770000000';

    if (!email || !password) {
      throw new Error(
        'SYSTEM_DISPATCHER_EMAIL and SYSTEM_DISPATCHER_PASSWORD must be set to seed the first dispatcher.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const formattedPhone = formatPhoneNumber(phone);

    await queryRunner.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone;`,
      [
        email,
        formattedPhone,
        passwordHash,
        'System',
        'Dispatcher',
        UserRole.DISPATCHER,
        UserStatus.ACTIVE,
      ],
    );

    // Explicit grants as well as the DISPATCHER bypass, so the account still
    // works if its role is ever changed and so `GET /api/auth/me` reports a
    // real set.
    await queryRunner.query(
      `INSERT INTO user_permissions (user_id, permission_id)
       SELECT u.id, p.id FROM users u CROSS JOIN permissions p
       WHERE u.email = $1
       ON CONFLICT (user_id, permission_id) DO NOTHING;`,
      [email],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.SYSTEM_DISPATCHER_EMAIL;
    if (!email) {
      return;
    }
    await queryRunner.query(
      `DELETE FROM user_permissions
       WHERE user_id IN (SELECT id FROM users WHERE email = $1);`,
      [email],
    );
    await queryRunner.query(`DELETE FROM users WHERE email = $1;`, [email]);
  }
}
