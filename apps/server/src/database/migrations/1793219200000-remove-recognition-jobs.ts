import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveRecognitionJobs1793219200000 implements MigrationInterface {
  name = 'RemoveRecognitionJobs1793219200000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "fk_expenses_recognition"`)
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "recognition_job_id"`)
    await queryRunner.query(`DROP INDEX "idx_recognition_jobs_due"`)
    await queryRunner.query(`DROP TABLE "recognition_jobs"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`ALTER TABLE "expenses" ADD COLUMN "recognition_job_id" bigint`)
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_recognition" FOREIGN KEY ("recognition_job_id") REFERENCES "recognition_jobs"("id")`,
    )
  }
}
