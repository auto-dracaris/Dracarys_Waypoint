import { MigrationInterface, QueryRunner } from 'typeorm';
import { flattenPermissions } from '../../common/constants/permissions.constant';

/**
 * Seeds one row per string in `PERMISSIONS`. Without these rows
 * PermissionsGuard fails closed for every caller that is not a dispatcher, so a new
 * permission added to the constant needs a follow-up migration that inserts
 * it — this one only covers what existed when it was written, and re-running
 * it is a no-op.
 */
export class SeedPermissionsCatalog1759000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const titles = flattenPermissions();
    const values = titles.map((_t, index) => `($${index + 1})`).join(', ');

    await queryRunner.query(
      `INSERT INTO permissions (title) VALUES ${values}
       ON CONFLICT (title) DO NOTHING;`,
      titles,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const titles = flattenPermissions();
    const placeholders = titles.map((_t, i) => `$${i + 1}`).join(', ');

    await queryRunner.query(
      `DELETE FROM permissions WHERE title IN (${placeholders});`,
      titles,
    );
  }
}
