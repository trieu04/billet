import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

const nullable = () => ValidateIf((_object, value) => value !== undefined && value !== null)

/** One `fieldProvenance` entry (OpenAPI shape; the recognition module validates it). */
export class FieldProvenanceDto {
  @ApiProperty({
    enum: ['user', 'ocr', 'personal_rule', 'default_rule', 'decision_model', 'capture_time'],
  })
  source: string
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' }) ruleId?: string
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' }) choiceId?: string
  @ApiPropertyOptional({ minimum: 0, maximum: 1 }) confidence?: number
  @ApiProperty({ enum: ['accepted', 'edited', 'entered', 'cleared', 'suggested'] })
  outcome: string
}

export class CreateExpenseDto {
  @ApiProperty({ pattern: '^[1-9]\\d*$' }) @Matches(/^[1-9]\d*$/) amountMinor: string
  @ApiProperty({ example: 'VND' }) @Matches(/^[A-Z]{3}$/) currency: string
  @ApiProperty({ format: 'date-time' }) @IsDateString() occurredAt: string
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) @IsString() @MaxLength(64) occurredTimezone: string
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d*$/) categoryId?: string
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d*$/) mediaAssetId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) caption?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) merchant?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) location?: string
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^-?(?:90(?:\.0{1,6})?|(?:[0-8]?\d)(?:\.\d{1,6})?)$/)
  latitude?: string
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^-?(?:180(?:\.0{1,6})?|(?:1[0-7]\d|[0-9]?\d)(?:\.\d{1,6})?)$/)
  longitude?: string
  @ApiPropertyOptional({
    type: Object,
    deprecated: true,
    description: 'Legacy field → source map; derived from fieldProvenance when that is sent.',
  })
  @IsOptional()
  @IsObject()
  fieldSources?: Record<string, string>
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: '^[1-9]\\d*$',
    description:
      'Inference (POST /expense-inferences) of the photo; marks the expense as recognition.',
  })
  @nullable()
  @Matches(/^[1-9]\d*$/)
  inferenceId?: string | null
  @ApiPropertyOptional({
    nullable: true,
    enum: [
      'receipt',
      'invoice',
      'parking_ticket',
      'transport_ticket',
      'payment_screenshot',
      'food',
      'product',
      'other',
    ],
  })
  @nullable()
  @IsString()
  @MaxLength(40)
  imageType?: string | null
  @ApiPropertyOptional({ type: String, nullable: true, pattern: '^[1-9]\\d*$' })
  @nullable()
  @Matches(/^[1-9]\d*$/)
  personalChoiceId?: string | null
  @ApiPropertyOptional({
    nullable: true,
    pattern: '^[0-9bcdefghjkmnpqrstuvwxyz]{7}$',
    description: '7-character geohash of the capture location.',
  })
  @nullable()
  @IsString()
  @MaxLength(7)
  placeKey?: string | null
  @ApiPropertyOptional({
    nullable: true,
    maxLength: 160,
    description: 'Merchant key; the server re-normalizes it (no diacritics, lowercase).',
  })
  @nullable()
  @IsString()
  @MaxLength(160)
  merchantKey?: string | null
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/FieldProvenanceDto' },
    description: 'Per field (amountMinor, occurredAt, merchant, categoryId): source and outcome.',
  })
  @IsOptional()
  @IsObject()
  fieldProvenance?: Record<string, FieldProvenanceDto>
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,100}$/)
  idempotencyKey: string
}
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) version: number
  @IsOptional() idempotencyKey?: never
}
export class ExpenseQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}
export class CalendarQueryDto {
  @ApiProperty({ example: '2026-10' }) @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string
  @ApiProperty({ example: 'VND' }) @Matches(/^[A-Z]{3}$/) currency: string
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) @IsString() @MaxLength(64) timezone: string
}
export class CalendarHistoryQueryDto {
  @ApiProperty({ example: '2026-10' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  throughMonth: string
  @ApiProperty({ example: 'VND' }) @Matches(/^[A-Z]{3}$/) currency: string
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) @IsString() @MaxLength(64) timezone: string
}
export class ExpenseResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) amountMinor: string
  @ApiProperty({ example: 'VND' }) currency: string
  @ApiProperty({ format: 'date-time' }) occurredAt: string
  @ApiProperty() occurredTimezone: string
  @ApiProperty() categoryId: string
  @ApiProperty({ nullable: true }) mediaAssetId: string | null
  @ApiProperty({ nullable: true }) caption: string | null
  @ApiProperty({ nullable: true }) merchant: string | null
  @ApiProperty({ nullable: true }) location: string | null
  @ApiProperty({ type: String, nullable: true }) inferenceId: string | null
  @ApiProperty({ type: String, nullable: true }) imageType: string | null
  @ApiProperty({ type: String, nullable: true }) personalChoiceId: string | null
  @ApiProperty({ type: String, nullable: true }) placeKey: string | null
  @ApiProperty({ type: String, nullable: true }) merchantKey: string | null
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/FieldProvenanceDto' },
  })
  fieldProvenance: Record<string, FieldProvenanceDto>
  @ApiProperty() version: number
  @ApiProperty({ format: 'date-time' }) createdAt: string
  @ApiProperty({ format: 'date-time' }) updatedAt: string
}

export class ExpenseTotalDto {
  @ApiProperty({ example: 'VND' }) currency: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
}

export class ExpenseListResponseDto {
  @ApiProperty({ type: [ExpenseResponseDto] }) data: ExpenseResponseDto[]
  @ApiProperty({ nullable: true }) nextCursor: string | null
  @ApiProperty({ type: [ExpenseTotalDto] }) totals: ExpenseTotalDto[]
}

export class CalendarDayDto {
  @ApiProperty({ format: 'date' }) date: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
  @ApiProperty({ type: String, nullable: true, pattern: '^[1-9]\\d*$' })
  representativeMediaId: string | null
  @ApiProperty({ type: [String], maxItems: 3, pattern: '^[1-9]\\d*$' })
  mediaAssetIds: string[]
}

export class ExpenseCalendarResponseDto {
  @ApiProperty({ example: '2026-10' }) month: string
  @ApiProperty({ example: 'VND' }) currency: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
  @ApiProperty({ type: [CalendarDayDto] }) days: CalendarDayDto[]
}

export class ExpenseCalendarHistoryResponseDto {
  @ApiProperty({ type: [ExpenseCalendarResponseDto] }) months: ExpenseCalendarResponseDto[]
}
