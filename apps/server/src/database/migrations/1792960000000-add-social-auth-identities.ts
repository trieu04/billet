import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSocialAuthIdentities1792960000000 implements MigrationInterface {
  name = 'AddSocialAuthIdentities1792960000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" bigserial NOT NULL,
        "provider" varchar(16) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "user_id" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_identities" PRIMARY KEY ("id"),
        CONSTRAINT "uq_auth_identities_provider_subject" UNIQUE ("provider", "subject"),
        CONSTRAINT "fk_auth_identities_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "idx_auth_identities_user" ON "auth_identities" ("user_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auth_identities"')
  }
}
