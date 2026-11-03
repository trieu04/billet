import { createHash } from 'node:crypto'
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** System image types: key, Vietnamese label, and the visual cues the decision model looks for. */
const IMAGE_TYPES: readonly [key: string, label: string, description: string][] = [
  [
    'receipt',
    'Hóa đơn bán lẻ',
    'Phiếu in nhiệt khổ hẹp từ máy tính tiền, có danh sách món, đơn giá và dòng tổng tiền.',
  ],
  [
    'invoice',
    'Hóa đơn GTGT',
    'Hóa đơn khổ A4 hoặc hóa đơn điện tử, có mã số thuế, bảng hàng hóa dịch vụ và thuế suất.',
  ],
  [
    'parking_ticket',
    'Vé gửi xe',
    'Vé hoặc thẻ nhỏ của bãi giữ xe, thường có biển số, giờ vào, mã vạch hoặc số thứ tự.',
  ],
  [
    'transport_ticket',
    'Vé đi lại',
    'Vé xe buýt, tàu, metro, máy bay hoặc phà, có tuyến, ga, chỗ ngồi hoặc giờ khởi hành.',
  ],
  [
    'payment_screenshot',
    'Ảnh màn hình thanh toán',
    'Ảnh chụp màn hình ứng dụng ngân hàng hoặc ví điện tử xác nhận chuyển tiền hoặc thanh toán.',
  ],
  ['food', 'Đồ ăn, thức uống', 'Ảnh chụp món ăn, đồ uống hoặc bàn ăn, không phải giấy tờ.'],
  ['product', 'Sản phẩm', 'Ảnh chụp hàng hóa, bao bì hoặc nhãn của sản phẩm đã mua.'],
  ['other', 'Khác', 'Ảnh không thuộc các loại trên.'],
]

/** System default rules: image type → system category code (category only, never an amount). */
const DEFAULT_RULES: readonly [imageType: string, categoryCode: string][] = [
  ['parking_ticket', 'transport'],
  ['transport_ticket', 'transport'],
  ['food', 'food'],
  ['invoice', 'bills'],
  ['product', 'shopping'],
]

/** Must match `conditionsHash` in modules/recognition/utils/conditions.ts. */
function conditionsHash(conditions: { imageType: string }): string {
  return createHash('sha256').update(JSON.stringify(conditions)).digest('hex')
}

export class AddExpenseSuggestions1793305600000 implements MigrationInterface {
  name = 'AddExpenseSuggestions1793305600000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_settings"
      ADD COLUMN "suggestions_enabled" boolean NOT NULL DEFAULT true,
      ADD COLUMN "rule_learning_enabled" boolean NOT NULL DEFAULT true,
      ADD COLUMN "suggestion_location_enabled" boolean NOT NULL DEFAULT false`)

    await queryRunner.query(`
      CREATE TABLE "decision_choices" (
        "id" bigserial PRIMARY KEY, "user_id" bigint, "kind" varchar(16) NOT NULL, "key" varchar(40),
        "label" varchar(80) NOT NULL, "description" varchar(240), "image_type_key" varchar(40),
        "place_key" varchar(7), "merchant_key" varchar(160), "origin" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'enabled', "support" integer NOT NULL DEFAULT 0,
        "last_selected_at" timestamptz, "suppressed_until" timestamptz, "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
        CONSTRAINT "fk_decision_choices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_decision_choices_kind" CHECK ("kind" IN ('image_type', 'personal')),
        CONSTRAINT "ck_decision_choices_origin" CHECK ("origin" IN ('system', 'learned', 'user')),
        CONSTRAINT "ck_decision_choices_status" CHECK ("status" IN ('enabled', 'disabled')),
        CONSTRAINT "ck_decision_choices_owner" CHECK (
          ("kind" = 'image_type' AND "user_id" IS NULL AND "origin" = 'system' AND "key" IS NOT NULL)
          OR ("kind" = 'personal' AND "user_id" IS NOT NULL AND "origin" IN ('learned', 'user')))
      )`)
    await queryRunner.query(
      `CREATE INDEX "idx_decision_choices_user" ON "decision_choices" ("user_id", "kind")`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_decision_choices_image_type_key" ON "decision_choices" ("key") WHERE "kind" = 'image_type'`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_decision_choices_learning_key" ON "decision_choices" ("user_id", "image_type_key", "place_key", "merchant_key") NULLS NOT DISTINCT WHERE "origin" = 'learned' AND "deleted_at" IS NULL`,
    )
    for (const [key, label, description] of IMAGE_TYPES) {
      await queryRunner.query(
        `INSERT INTO "decision_choices" ("kind", "key", "label", "description", "image_type_key", "origin") VALUES ('image_type', $1, $2, $3, $1, 'system')`,
        [key, label, description],
      )
    }

    await queryRunner.query(`
      CREATE TABLE "expense_rules" (
        "id" bigserial PRIMARY KEY, "user_id" bigint, "origin" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'enabled', "conditions" jsonb NOT NULL,
        "conditions_hash" varchar(64) NOT NULL, "actions" jsonb NOT NULL, "currency" varchar(3),
        "confidence" double precision NOT NULL DEFAULT 1, "support" integer NOT NULL DEFAULT 0,
        "last_used_at" timestamptz, "suppressed_until" timestamptz, "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
        CONSTRAINT "fk_expense_rules_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_expense_rules_origin" CHECK ("origin" IN ('default', 'learned', 'user')),
        CONSTRAINT "ck_expense_rules_status" CHECK ("status" IN ('enabled', 'disabled')),
        CONSTRAINT "ck_expense_rules_owner" CHECK (("origin" = 'default') = ("user_id" IS NULL)),
        CONSTRAINT "ck_expense_rules_confidence" CHECK ("confidence" >= 0 AND "confidence" <= 1)
      )`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_expense_rules_user_conditions" ON "expense_rules" ("user_id", "conditions_hash") NULLS NOT DISTINCT`,
    )
    for (const [imageType, categoryCode] of DEFAULT_RULES) {
      await queryRunner.query(
        `INSERT INTO "expense_rules" ("origin", "conditions", "conditions_hash", "actions", "confidence")
         SELECT 'default', jsonb_build_object('imageType', $1::text), $2, jsonb_build_object('categoryId', "id"::text), 0.5
         FROM "categories" WHERE "code" = $3 AND "user_id" IS NULL`,
        [imageType, conditionsHash({ imageType }), categoryCode],
      )
    }

    await queryRunner.query(`
      CREATE TABLE "expense_inferences" (
        "id" bigserial PRIMARY KEY, "user_id" bigint NOT NULL, "client_request_id" varchar(100) NOT NULL,
        "provider" varchar(40) NOT NULL, "model" varchar(120) NOT NULL, "status" varchar(16) NOT NULL,
        "reason" varchar(40), "choice_set_version" varchar(64) NOT NULL DEFAULT '', "selections" jsonb,
        "image_bytes" integer NOT NULL, "latency_ms" integer NOT NULL, "usage" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_expense_inferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_expense_inferences_status" CHECK ("status" IN ('succeeded', 'unavailable', 'disabled'))
      )`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_expense_inferences_user_request" ON "expense_inferences" ("user_id", "client_request_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expense_inferences_created" ON "expense_inferences" ("created_at")`,
    )

    await queryRunner.query(`ALTER TABLE "expenses"
      ADD COLUMN "inference_id" bigint,
      ADD COLUMN "image_type" varchar(40),
      ADD COLUMN "personal_choice_id" bigint,
      ADD COLUMN "place_key" varchar(7),
      ADD COLUMN "merchant_key" varchar(160),
      ADD COLUMN "field_provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD CONSTRAINT "fk_expenses_inference" FOREIGN KEY ("inference_id") REFERENCES "expense_inferences"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "fk_expenses_personal_choice" FOREIGN KEY ("personal_choice_id") REFERENCES "decision_choices"("id") ON DELETE SET NULL`)
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_learning_choice" ON "expenses" ("user_id", "personal_choice_id", "occurred_at") WHERE "personal_choice_id" IS NOT NULL AND "deleted_at" IS NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_learning_place" ON "expenses" ("user_id", "image_type", "place_key", "occurred_at") WHERE "place_key" IS NOT NULL AND "deleted_at" IS NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_learning_merchant" ON "expenses" ("user_id", "merchant_key", "occurred_at") WHERE "merchant_key" IS NOT NULL AND "deleted_at" IS NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_expenses_learning_merchant"`)
    await queryRunner.query(`DROP INDEX "idx_expenses_learning_place"`)
    await queryRunner.query(`DROP INDEX "idx_expenses_learning_choice"`)
    await queryRunner.query(`ALTER TABLE "expenses"
      DROP CONSTRAINT "fk_expenses_personal_choice",
      DROP CONSTRAINT "fk_expenses_inference",
      DROP COLUMN "field_provenance",
      DROP COLUMN "merchant_key",
      DROP COLUMN "place_key",
      DROP COLUMN "personal_choice_id",
      DROP COLUMN "image_type",
      DROP COLUMN "inference_id"`)
    await queryRunner.query(`DROP TABLE "expense_inferences"`)
    await queryRunner.query(`DROP TABLE "expense_rules"`)
    await queryRunner.query(`DROP TABLE "decision_choices"`)
    await queryRunner.query(`ALTER TABLE "user_settings"
      DROP COLUMN "suggestion_location_enabled",
      DROP COLUMN "rule_learning_enabled",
      DROP COLUMN "suggestions_enabled"`)
  }
}
