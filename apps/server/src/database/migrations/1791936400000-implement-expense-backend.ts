import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ImplementExpenseBackend1791936400000 implements MigrationInterface {
  name = 'ImplementExpenseBackend1791936400000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_settings_appearance_enum" AS ENUM ('system','light','dark')`,
    )
    await queryRunner.query(
      `CREATE TYPE "media_assets_status_enum" AS ENUM ('pending','processing','ready','failed')`,
    )
    await queryRunner.query(
      `CREATE TYPE "job_status_enum" AS ENUM ('pending','processing','succeeded','failed','canceled')`,
    )
    await queryRunner.query(`CREATE TYPE "expenses_source_enum" AS ENUM ('manual','recognition')`)
    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL UNIQUE,
        "default_currency" varchar(3) NOT NULL DEFAULT 'VND',
        "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        "locale" varchar(16) NOT NULL DEFAULT 'vi',
        "appearance" "user_settings_appearance_enum" NOT NULL DEFAULT 'system',
        "reminder_enabled" boolean NOT NULL DEFAULT false, "reminder_time" time,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`)
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" bigserial PRIMARY KEY, "code" varchar(40) NOT NULL UNIQUE, "name" varchar(80) NOT NULL,
        "color" varchar(7) NOT NULL, "icon" varchar(40) NOT NULL, "sort_order" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`)
    await queryRunner.query(`INSERT INTO "categories" ("code","name","color","icon","sort_order") VALUES
      ('food','Ăn uống','#FF8A65','utensils',10), ('transport','Di chuyển','#4FC3F7','car',20),
      ('shopping','Mua sắm','#BA68C8','shopping-bag',30), ('entertainment','Giải trí','#FFD54F','gamepad',40),
      ('bills','Hóa đơn','#4DB6AC','receipt',50), ('health','Sức khỏe','#E57373','heart',60),
      ('education','Giáo dục','#7986CB','book',70), ('other','Khác','#90A4AE','more-horizontal',999)`)
    await queryRunner.query(`
      CREATE TABLE "media_assets" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "storage_key" varchar(128) NOT NULL UNIQUE,
        "thumbnail_key" varchar(128), "mime_type" varchar(100) NOT NULL, "size_bytes" bigint NOT NULL,
        "width" integer, "height" integer, "status" "media_assets_status_enum" NOT NULL DEFAULT 'pending',
        "failure_reason" varchar(500), "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
        CONSTRAINT "fk_media_assets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_media_assets_size" CHECK ("size_bytes" > 0)
      )`)
    await queryRunner.query(
      `CREATE INDEX "idx_media_assets_user_created" ON "media_assets" ("user_id","created_at")`,
    )
    await queryRunner.query(`
      CREATE TABLE "recognition_jobs" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "media_asset_id" bigint NOT NULL,
        "provider" varchar(40) NOT NULL DEFAULT 'disabled', "status" "job_status_enum" NOT NULL DEFAULT 'pending',
        "suggestion" jsonb, "attempts" integer NOT NULL DEFAULT 0, "max_attempts" integer NOT NULL DEFAULT 3,
        "available_at" timestamptz NOT NULL DEFAULT now(), "lease_expires_at" timestamptz, "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recognition_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_recognition_media" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id")
      )`)
    await queryRunner.query(
      `CREATE INDEX "idx_recognition_jobs_due" ON "recognition_jobs" ("status","available_at")`,
    )
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "category_id" bigint NOT NULL,
        "media_asset_id" bigint, "recognition_job_id" bigint, "amount_minor" bigint NOT NULL,
        "currency" varchar(3) NOT NULL, "occurred_at" timestamptz NOT NULL, "occurred_timezone" varchar(64) NOT NULL,
        "caption" varchar(500), "merchant" varchar(160), "location" varchar(240),
        "latitude" decimal(9,6), "longitude" decimal(9,6), "source" "expenses_source_enum" NOT NULL DEFAULT 'manual',
        "field_sources" jsonb NOT NULL DEFAULT '{}'::jsonb, "idempotency_key" varchar(100) NOT NULL,
        "request_hash" varchar(64) NOT NULL, "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
        CONSTRAINT "fk_expenses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_expenses_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id"),
        CONSTRAINT "fk_expenses_media" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id"),
        CONSTRAINT "fk_expenses_recognition" FOREIGN KEY ("recognition_job_id") REFERENCES "recognition_jobs"("id"),
        CONSTRAINT "ck_expenses_amount" CHECK ("amount_minor" > 0),
        CONSTRAINT "ck_expenses_currency" CHECK ("currency" ~ '^[A-Z]{3}$'),
        CONSTRAINT "ck_expenses_coordinates" CHECK (("latitude" IS NULL) = ("longitude" IS NULL))
      )`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_expenses_idempotency" ON "expenses" ("user_id","idempotency_key")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_user_time" ON "expenses" ("user_id","occurred_at" DESC,"id" DESC) WHERE "deleted_at" IS NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_aggregate" ON "expenses" ("user_id","currency","occurred_at") WHERE "deleted_at" IS NULL`,
    )
    await queryRunner.query(`
      CREATE TABLE "monthly_budgets" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "month" date NOT NULL, "currency" varchar(3) NOT NULL,
        "limit_minor" bigint NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_budgets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_budgets_month" UNIQUE ("user_id","month","currency"), CONSTRAINT "ck_budgets_limit" CHECK ("limit_minor" > 0)
      )`)
    await queryRunner.query(`
      CREATE TABLE "reminder_schedules" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL UNIQUE, "next_run_at" timestamptz NOT NULL,
        "last_local_date" date, "lease_expires_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "fk_reminders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`)
    await queryRunner.query(
      `CREATE INDEX "idx_reminders_due" ON "reminder_schedules" ("next_run_at")`,
    )
    await queryRunner.query(`
      CREATE TABLE "export_jobs" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "status" "job_status_enum" NOT NULL DEFAULT 'pending',
        "from" timestamptz, "to" timestamptz, "currency" varchar(3), "snapshot_at" timestamptz,
        "storage_key" varchar(128), "download_expires_at" timestamptz, "attempts" integer NOT NULL DEFAULT 0,
        "available_at" timestamptz NOT NULL DEFAULT now(), "lease_expires_at" timestamptz, "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_exports_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_exports_range" CHECK ("from" IS NULL OR "to" IS NULL OR "from" < "to")
      )`)
    await queryRunner.query(
      `CREATE INDEX "idx_export_jobs_due" ON "export_jobs" ("status","available_at")`,
    )
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN "deduplication_key" varchar(100)`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_notifications_dedup" ON "notifications" ("user_id","deduplication_key") WHERE "deduplication_key" IS NOT NULL AND "deleted_at" IS NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_notifications_dedup"`)
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deduplication_key"`)
    for (const table of [
      'export_jobs',
      'reminder_schedules',
      'monthly_budgets',
      'expenses',
      'recognition_jobs',
      'media_assets',
      'categories',
      'user_settings',
    ]) {
      await queryRunner.query(`DROP TABLE "${table}"`)
    }
    await queryRunner.query(`DROP TYPE "expenses_source_enum"`)
    await queryRunner.query(`DROP TYPE "job_status_enum"`)
    await queryRunner.query(`DROP TYPE "media_assets_status_enum"`)
    await queryRunner.query(`DROP TYPE "user_settings_appearance_enum"`)
  }
}
