import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddInferenceAdminFields1793392000000 implements MigrationInterface {
  name = 'AddInferenceAdminFields1793392000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expense_inferences" ADD COLUMN "provider_called" boolean NOT NULL DEFAULT false`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_inference" ON "expenses" ("inference_id") WHERE "inference_id" IS NOT NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_expenses_inference"`)
    await queryRunner.query(`ALTER TABLE "expense_inferences" DROP COLUMN "provider_called"`)
  }
}
