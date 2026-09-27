import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_SETTINGS } from '../../modules/settings/constants/default-settings.constant';

/**
 * Seeds the operational settings once. Values an operator has since changed are
 * left alone (`DO NOTHING`, not `DO UPDATE`) — this migration establishes
 * defaults, it does not reset them.
 */
export class SeedDefaultSettings1759000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const params: string[] = [];
    const values = DEFAULT_SETTINGS.map((setting, index) => {
      const offset = index * 4;
      params.push(
        setting.key,
        setting.value,
        setting.type,
        setting.description,
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(', ');

    await queryRunner.query(
      `INSERT INTO system_settings ("key", "value", "type", "description")
       VALUES ${values}
       ON CONFLICT ("key") DO NOTHING;`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = DEFAULT_SETTINGS.map((s) => s.key);
    const placeholders = keys.map((_k, i) => `$${i + 1}`).join(', ');

    await queryRunner.query(
      `DELETE FROM system_settings WHERE "key" IN (${placeholders});`,
      keys,
    );
  }
}
