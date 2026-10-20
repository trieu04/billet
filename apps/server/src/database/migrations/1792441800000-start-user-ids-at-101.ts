import type { MigrationInterface, QueryRunner } from 'typeorm'

export class StartUserIdsAt1011792441800000 implements MigrationInterface {
  name = 'StartUserIdsAt1011792441800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE next_id bigint;
      BEGIN
        LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;
        ALTER SEQUENCE users_id_seq START WITH 101;
        SELECT greatest(
          101,
          (SELECT coalesce(max(id), 0) + 1 FROM users),
          last_value + CASE WHEN is_called THEN 1 ELSE 0 END
        ) INTO next_id FROM users_id_seq;
        EXECUTE format('ALTER SEQUENCE users_id_seq RESTART WITH %s', next_id);
      END $$;
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Preserve allocated IDs when reverting the default starting value.
    await queryRunner.query('ALTER SEQUENCE users_id_seq START WITH 1')
  }
}
