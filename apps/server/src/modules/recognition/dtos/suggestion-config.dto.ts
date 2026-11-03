import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IMAGE_TYPE_KEYS } from '../constants'

export class SuggestionImageTypeDto {
  @ApiProperty({ enum: IMAGE_TYPE_KEYS }) key: string
  @ApiProperty() label: string
  @ApiPropertyOptional() description?: string
}

export class SuggestionChoiceDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty() label: string
  @ApiPropertyOptional({ enum: IMAGE_TYPE_KEYS }) imageType?: string
  @ApiPropertyOptional() placeKey?: string
  @ApiPropertyOptional() merchantKey?: string
}

export class RuleConditionsDto {
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' }) choiceId?: string
  @ApiPropertyOptional({ enum: IMAGE_TYPE_KEYS }) imageType?: string
  @ApiPropertyOptional({ pattern: '^[0-9bcdefghjkmnpqrstuvwxyz]{7}$' }) placeKey?: string
  @ApiPropertyOptional() merchantKey?: string
}

export class RuleActionsDto {
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' }) amountMinor?: string
  @ApiPropertyOptional({ example: 'VND' }) currency?: string
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' }) categoryId?: string
  @ApiPropertyOptional() merchant?: string
}

export class SuggestionRuleDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ enum: ['default', 'learned', 'user'] }) origin: 'default' | 'learned' | 'user'
  @ApiProperty({ type: RuleConditionsDto }) conditions: RuleConditionsDto
  @ApiProperty({ type: RuleActionsDto }) actions: RuleActionsDto
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence: number
  @ApiProperty({ format: 'date-time' }) updatedAt: string
}

export class SuggestionThresholdsDto {
  @ApiProperty() ocrAmount: number
  @ApiProperty() personalRule: number
  @ApiProperty() decisionCategory: number
}

export class DecisionImageConfigDto {
  @ApiProperty() maxEdgePx: number
  @ApiProperty() quality: number
  @ApiProperty() retryQuality: number
  @ApiProperty() targetBytes: number
  @ApiProperty() maxBytes: number
}

export class SuggestionFeaturesDto {
  @ApiProperty({ description: 'Photo suggestions are on for the account.' }) suggestions: boolean
  @ApiProperty({ description: 'Learning from saved expenses is on.' }) ruleLearning: boolean
  @ApiProperty({ description: 'The account allows sending a placeKey.' }) location: boolean
  @ApiProperty({
    description:
      'A decision provider is configured; when false clients should not send images (OCR and rules still apply).',
  })
  decision: boolean
}

export class SuggestionConfigResponseDto {
  @ApiProperty({ description: 'Same value as the ETag response header.' }) etag: string
  @ApiProperty({ type: [SuggestionImageTypeDto] }) imageTypes: SuggestionImageTypeDto[]
  @ApiProperty({ type: [SuggestionChoiceDto], description: 'Enabled personal choices.' })
  choices: SuggestionChoiceDto[]
  @ApiProperty({ type: [SuggestionRuleDto], description: 'Enabled learned and user rules.' })
  rules: SuggestionRuleDto[]
  @ApiProperty({ type: [SuggestionRuleDto], description: 'System default rules (category only).' })
  defaultRules: SuggestionRuleDto[]
  @ApiProperty({ type: SuggestionThresholdsDto }) thresholds: SuggestionThresholdsDto
  @ApiProperty({ type: DecisionImageConfigDto }) decisionImage: DecisionImageConfigDto
  @ApiProperty({ type: SuggestionFeaturesDto }) features: SuggestionFeaturesDto
}
