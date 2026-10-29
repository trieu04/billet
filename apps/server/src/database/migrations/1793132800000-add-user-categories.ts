import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserCategories1793132800000 implements MigrationInterface {
  name = 'AddUserCategories1793132800000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "user_id" bigint`)
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    )
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "categories_code_key"`)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_categories_code" ON "categories" ("code")`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categories_user_name_active" ON "categories" ("user_id", lower("name")) WHERE "user_id" IS NOT NULL AND "active" = true`,
    )
    await queryRunner.query(`UPDATE "categories" SET "icon" = CASE "code"
      WHEN 'food' THEN 'coffee'
      WHEN 'transport' THEN 'navigation'
      WHEN 'shopping' THEN 'shopping-bag'
      WHEN 'entertainment' THEN 'play-circle'
      WHEN 'bills' THEN 'file-text'
      WHEN 'health' THEN 'heart'
      WHEN 'education' THEN 'book-open'
      ELSE 'grid' END`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "categories" SET "icon" = CASE "code"
      WHEN 'food' THEN 'utensils'
      WHEN 'transport' THEN 'car'
      WHEN 'shopping' THEN 'shopping-bag'
      WHEN 'entertainment' THEN 'gamepad'
      WHEN 'bills' THEN 'receipt'
      WHEN 'health' THEN 'heart'
      WHEN 'education' THEN 'book'
      ELSE 'more-horizontal' END WHERE "user_id" IS NULL`)
    await queryRunner.query(
      `UPDATE "expenses" SET "category_id" = (SELECT "id" FROM "categories" WHERE "code" = 'other' AND "user_id" IS NULL) WHERE "category_id" IN (SELECT "id" FROM "categories" WHERE "user_id" IS NOT NULL)`,
    )
    await queryRunner.query(`DELETE FROM "categories" WHERE "user_id" IS NOT NULL`)
    await queryRunner.query(`DROP INDEX "uq_categories_user_name_active"`)
    await queryRunner.query(`DROP INDEX "uq_categories_code"`)
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "categories_code_key" UNIQUE ("code")`,
    )
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "fk_categories_user"`)
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "user_id"`)
  }
}
