import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import { IsPositiveBigint } from '../../../shared/validators/bigint'

const BIGINT = /^[1-9]\d{0,18}$/

export class AdminSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive start; defaults to 7 days before `to`.' })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiPropertyOptional({ description: 'Exclusive end; defaults to now.' })
  @IsOptional()
  @IsDateString()
  to?: string

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh', default: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) provider?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) model?: string
}

export class AdminInferenceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string
  @ApiPropertyOptional({ enum: ['succeeded', 'unavailable', 'disabled'] })
  @IsOptional()
  @IsIn(['succeeded', 'unavailable', 'disabled'])
  status?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) reason?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) provider?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) model?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imageType?: string
  @ApiPropertyOptional({ pattern: BIGINT.source }) @IsOptional() @IsPositiveBigint() userId?: string
  @ApiPropertyOptional({ pattern: BIGINT.source }) @IsOptional() @IsPositiveBigint() cursor?: string

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}

export class AdminImageTypeSelectionDto {
  @ApiProperty() key: string
  @ApiProperty({ nullable: true }) label: string | null
  @ApiProperty() confidence: number
}

export class AdminCategorySelectionDto {
  @ApiProperty({ enum: ['system', 'user'] }) kind: 'system' | 'user'
  @ApiPropertyOptional({ description: 'System categories only.' }) code?: string
  @ApiPropertyOptional({ description: 'System categories only.' }) name?: string
  @ApiProperty() confidence: number
}

export class AdminPersonalSelectionDto {
  @ApiProperty({ enum: [true] }) selected: true
  @ApiProperty() confidence: number
}

/** De-identified inference. `userId` is the only reference to the person. */
export class AdminInferenceDto {
  @ApiProperty({ type: String }) id: string
  @ApiProperty({ type: String }) userId: string
  @ApiProperty({ format: 'date-time' }) createdAt: string
  @ApiProperty() provider: string
  @ApiProperty() model: string
  @ApiProperty({ enum: ['succeeded', 'unavailable', 'disabled'] }) status: string
  @ApiProperty({ type: String, nullable: true }) reason: string | null
  @ApiProperty() latencyMs: number
  @ApiProperty() providerCalled: boolean
  @ApiProperty({ type: AdminImageTypeSelectionDto, nullable: true })
  imageType: AdminImageTypeSelectionDto | null
  @ApiProperty({ type: AdminCategorySelectionDto, nullable: true })
  category: AdminCategorySelectionDto | null
  @ApiProperty({ type: AdminPersonalSelectionDto, nullable: true })
  personalChoice: AdminPersonalSelectionDto | null
}

export class AdminInferencePageDto {
  @ApiProperty({ type: [AdminInferenceDto] }) data: AdminInferenceDto[]
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null
  @ApiProperty() hasMore: boolean
}

export class AdminUsageDto {
  @ApiPropertyOptional() inputTokens?: number
  @ApiPropertyOptional() outputTokens?: number
  @ApiPropertyOptional() costMicroUsd?: number
}

export class AdminFieldProvenanceDto {
  @ApiProperty() field: string
  @ApiProperty() source: string
  @ApiProperty() outcome: string
  @ApiProperty({ type: Number, nullable: true }) confidence: number | null
}

export class AdminLinkedExpenseDto {
  @ApiProperty({ description: 'Whether the expense has a saved photo.' }) hasPhoto: boolean
  @ApiProperty({ type: [AdminFieldProvenanceDto] }) fields: AdminFieldProvenanceDto[]
}

export class AdminChoiceDto {
  @ApiProperty({ description: 'Request-scoped code the provider saw, such as `c3`.' }) ref: string
  @ApiProperty() label: string
  @ApiPropertyOptional() description?: string
  @ApiProperty({ description: 'Whether the provider selected this choice.' }) selected: boolean
}

export class AdminInferenceInputDto {
  @ApiProperty() locale: string
  @ApiProperty({ type: [AdminChoiceDto] }) imageTypes: AdminChoiceDto[]
  @ApiProperty({ type: [AdminChoiceDto] }) categories: AdminChoiceDto[]
  @ApiProperty({ type: [AdminChoiceDto] }) personal: AdminChoiceDto[]
}

export class AdminOutputSelectionDto {
  @ApiProperty() ref: string
  @ApiProperty({ type: String, nullable: true }) label: string | null
  @ApiProperty() confidence: number
}

export class AdminInferenceOutputDto {
  @ApiProperty({ type: AdminOutputSelectionDto }) imageType: AdminOutputSelectionDto
  @ApiProperty({ type: AdminOutputSelectionDto, nullable: true })
  category: AdminOutputSelectionDto | null
  @ApiProperty({ type: AdminOutputSelectionDto, nullable: true })
  personal: AdminOutputSelectionDto | null
}

export class AdminInferenceDetailDto extends AdminInferenceDto {
  @ApiProperty({
    type: AdminInferenceInputDto,
    nullable: true,
    description:
      'The choices offered to the provider, including the account’s category and personal choice labels. Null for inferences recorded before this was kept, or when no choice set was built. The photo is never included.',
  })
  input: AdminInferenceInputDto | null
  @ApiProperty({
    type: AdminInferenceOutputDto,
    nullable: true,
    description: 'The provider’s validated answer by ref. Null when it returned none.',
  })
  output: AdminInferenceOutputDto | null
  @ApiProperty({ type: AdminUsageDto, nullable: true }) usage: AdminUsageDto | null
  @ApiProperty() imageBytes: number
  @ApiProperty() choiceSetVersion: string
  @ApiProperty({ type: [AdminLinkedExpenseDto] }) linkedExpenses: AdminLinkedExpenseDto[]
}

export class AdminUsageTotalsDto {
  @ApiProperty() inputTokens: number
  @ApiProperty() outputTokens: number
  @ApiProperty() costMicroUsd: number
}

export class AdminCountDto {
  @ApiProperty() key: string
  @ApiProperty() count: number
}

export class AdminProviderStatsDto extends AdminUsageTotalsDto {
  @ApiProperty() provider: string
  @ApiProperty() model: string
  @ApiProperty() total: number
  @ApiProperty() providerCalls: number
  @ApiProperty() unavailable: number
}

export class AdminDailyStatsDto {
  @ApiProperty({ example: '2026-11-03' }) day: string
  @ApiProperty() total: number
  @ApiProperty() succeeded: number
  @ApiProperty() unavailable: number
  @ApiProperty() disabled: number
  @ApiProperty() costMicroUsd: number
}

export class AdminFieldOutcomeDto {
  @ApiProperty() field: string
  @ApiProperty() outcome: string
  @ApiProperty() count: number
}

export class AdminSummaryDto {
  @ApiProperty({ format: 'date-time' }) from: string
  @ApiProperty({ format: 'date-time' }) to: string
  @ApiProperty() timezone: string
  @ApiProperty() total: number
  @ApiProperty({ type: [AdminCountDto] }) byStatus: AdminCountDto[]
  @ApiProperty({ type: [AdminCountDto] }) byReason: AdminCountDto[]
  @ApiProperty({ type: [AdminCountDto] }) byImageType: AdminCountDto[]
  @ApiProperty() providerCalls: number
  @ApiProperty({ type: Number, nullable: true }) latencyP50Ms: number | null
  @ApiProperty({ type: Number, nullable: true }) latencyP95Ms: number | null
  @ApiProperty({ type: AdminUsageTotalsDto }) usage: AdminUsageTotalsDto
  @ApiProperty({ type: [AdminDailyStatsDto] }) daily: AdminDailyStatsDto[]
  @ApiProperty({ type: [AdminProviderStatsDto] }) byProvider: AdminProviderStatsDto[]
  @ApiProperty({ type: [AdminFieldOutcomeDto] }) fieldOutcomes: AdminFieldOutcomeDto[]
}

export class UpdateImageTypeDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  label?: string

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 240 })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(240)
  description?: string | null

  @ApiPropertyOptional({ enum: ['enabled', 'disabled'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled'

  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) version: number
}

export class UpdateDefaultRuleDto {
  @ApiPropertyOptional({ type: String, pattern: BIGINT.source })
  @IsOptional()
  @IsPositiveBigint()
  categoryId?: string

  @ApiPropertyOptional({ enum: ['enabled', 'disabled'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled'

  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) version: number
}

export class AdminImageTypeDto {
  @ApiProperty() key: string
  @ApiProperty() label: string
  @ApiProperty({ type: String, nullable: true }) description: string | null
  @ApiProperty({ enum: ['enabled', 'disabled'] }) status: string
  @ApiProperty() version: number
}

export class AdminDefaultRuleDto {
  @ApiProperty({ type: String }) id: string
  @ApiProperty() imageType: string
  @ApiProperty({ type: String, nullable: true }) categoryId: string | null
  @ApiProperty({ type: String, nullable: true }) categoryName: string | null
  @ApiProperty({ enum: ['enabled', 'disabled'] }) status: string
  @ApiProperty() confidence: number
  @ApiProperty() version: number
}

export class AdminSystemCategoryDto {
  @ApiProperty({ type: String }) id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
}

export class AdminThresholdsDto {
  @ApiProperty() ocrAmount: number
  @ApiProperty() personalRule: number
  @ApiProperty() decisionCategory: number
}

export class AdminDecisionImageDto {
  @ApiProperty() maxEdgePx: number
  @ApiProperty() quality: number
  @ApiProperty() retryQuality: number
  @ApiProperty() targetBytes: number
  @ApiProperty() maxBytes: number
}

export class AdminCatalogDto {
  @ApiProperty({ type: [AdminImageTypeDto] }) imageTypes: AdminImageTypeDto[]
  @ApiProperty({ type: [AdminDefaultRuleDto] }) defaultRules: AdminDefaultRuleDto[]
  @ApiProperty({ type: [AdminSystemCategoryDto] }) categories: AdminSystemCategoryDto[]
  @ApiProperty({ type: AdminThresholdsDto }) thresholds: AdminThresholdsDto
  @ApiProperty({ type: AdminDecisionImageDto }) decisionImage: AdminDecisionImageDto
}

export class PlaygroundRequestDto {
  @ApiProperty({ example: 'vi-VN' })
  @IsString()
  @Matches(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/)
  locale: string
}

export class PlaygroundMultipartDto extends PlaygroundRequestDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Compressed JPEG photo.' })
  image: unknown
}

export class PlaygroundChoiceDto {
  @ApiProperty({ enum: ['image_type', 'category'] }) kind: 'image_type' | 'category'
  @ApiProperty() label: string
}

export class PlaygroundSelectionDto {
  @ApiProperty() label: string
  @ApiProperty() confidence: number
}

export class PlaygroundDefaultRuleDto {
  @ApiProperty({ type: String }) id: string
  @ApiProperty({ type: String, nullable: true }) categoryName: string | null
  @ApiProperty() confidence: number
}

export class PlaygroundResponseDto {
  @ApiProperty({ enum: ['succeeded', 'unavailable', 'disabled'] }) status: string
  @ApiPropertyOptional() reason?: string
  @ApiProperty() provider: string
  @ApiProperty() model: string
  @ApiProperty() latencyMs: number
  @ApiProperty({ type: AdminUsageDto, nullable: true }) usage: AdminUsageDto | null
  @ApiProperty() imageBytes: number
  @ApiProperty({ type: [PlaygroundChoiceDto] }) choices: PlaygroundChoiceDto[]
  @ApiProperty({ type: PlaygroundSelectionDto, nullable: true })
  imageType: PlaygroundSelectionDto | null
  @ApiProperty({ type: PlaygroundSelectionDto, nullable: true })
  category: PlaygroundSelectionDto | null
  @ApiProperty() categoryMeetsThreshold: boolean
  @ApiProperty({ type: PlaygroundDefaultRuleDto, nullable: true })
  defaultRule: PlaygroundDefaultRuleDto | null
}
