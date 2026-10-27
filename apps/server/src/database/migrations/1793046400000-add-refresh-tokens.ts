import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRefreshTokens1793046400000 implements MigrationInterface {
  name = 'AddRefreshTokens1793046400000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_refresh_tokens" (
        "id" bigserial NOT NULL,
        "token_hash" char(64) NOT NULL,
        "user_id" bigint NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_auth_refresh_tokens_token_hash" ON "auth_refresh_tokens" ("token_hash")',
    )
    await queryRunner.query(
      'CREATE INDEX "idx_auth_refresh_tokens_user" ON "auth_refresh_tokens" ("user_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auth_refresh_tokens"')
  }
}
