import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitializeServerSchema1791850000000 implements MigrationInterface {
  name = 'InitializeServerSchema1791850000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "push_devices_platform_enum" AS ENUM ('android', 'ios', 'web')`,
    )
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" bigserial NOT NULL,
        "username" varchar(30) NOT NULL,
        "email" varchar(320) NOT NULL,
        "display_name" varchar(100) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "email_verified" boolean NOT NULL DEFAULT false,
        "phone_number" varchar(20),
        "phone_number_verified" boolean NOT NULL DEFAULT false,
        "mfa_methods" text[] NOT NULL DEFAULT '{}',
        "authenticator_secret" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_users_username" UNIQUE ("username"),
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "uq_users_phone_number" UNIQUE ("phone_number"),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "auth_challenges" (
        "id" bigserial NOT NULL,
        "user_id" bigint,
        "destination" varchar(320) NOT NULL,
        "purpose" varchar(32) NOT NULL,
        "code_hash" varchar(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "sent_at" timestamptz NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_auth_challenges" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_challenges_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "idx_auth_challenges_destination_purpose" ON "auth_challenges" ("destination", "purpose")',
    )
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" bigserial NOT NULL,
        "user_id" bigint NOT NULL,
        "type" varchar(50) NOT NULL,
        "title" varchar(140) NOT NULL,
        "body" varchar(500) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC)',
    )
    await queryRunner.query(
      'CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL',
    )
    await queryRunner.query(`
      CREATE TABLE "push_devices" (
        "id" bigserial NOT NULL,
        "user_id" bigint NOT NULL,
        "token" varchar(2048) NOT NULL,
        "platform" "push_devices_platform_enum" NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_push_devices" PRIMARY KEY ("id"),
        CONSTRAINT "fk_push_devices_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_push_devices_token" ON "push_devices" ("token")',
    )
    await queryRunner.query(
      'CREATE INDEX "idx_push_devices_user_active" ON "push_devices" ("user_id", "active")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "push_devices"')
    await queryRunner.query('DROP TABLE "notifications"')
    await queryRunner.query('DROP TABLE "auth_challenges"')
    await queryRunner.query('DROP TABLE "users"')
    await queryRunner.query('DROP TYPE "push_devices_platform_enum"')
  }
}
