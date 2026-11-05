import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddInferenceInputOutput1793478400000 implements MigrationInterface {
  name = 'AddInferenceInputOutput1793478400000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expense_inferences" ADD COLUMN "input" jsonb`)
    await queryRunner.query(`ALTER TABLE "expense_inferences" ADD COLUMN "output" jsonb`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expense_inferences" DROP COLUMN "output"`)
    await queryRunner.query(`ALTER TABLE "expense_inferences" DROP COLUMN "input"`)
  }
}
