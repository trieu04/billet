import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { IMAGE_TYPE_KEYS } from '../constants'
import { PLACE_KEY_REGEX } from '../utils/keys'

const STATUSES = ['enabled', 'disabled'] as const

export class RuleConditionsInputDto {
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$', description: 'Personal choice id.' })
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  choiceId?: string

  @ApiPropertyOptional({ enum: IMAGE_TYPE_KEYS })
  @IsOptional()
  @IsIn(IMAGE_TYPE_KEYS)
  imageType?: string

  @ApiPropertyOptional({ pattern: PLACE_KEY_REGEX.source })
  @IsOptional()
  @Matches(PLACE_KEY_REGEX)
  placeKey?: string

  @ApiPropertyOptional({ maxLength: 160, description: 'Merchant name or key; normalized.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  merchantKey?: string
}

export class RuleActionsInputDto {
  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$', description: 'Requires currency.' })
  @IsOptional()
  @Matches(/^[1-9]\d{0,17}$/)
  amountMinor?: string

  @ApiPropertyOptional({ example: 'VND' }) @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string

  @ApiPropertyOptional({ type: String, pattern: '^[1-9]\\d*$' })
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  categoryId?: string

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  merchant?: string
}

export class CreateExpenseRuleDto {
  @ApiProperty({ type: RuleConditionsInputDto, description: 'At least one condition.' })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RuleConditionsInputDto)
  conditions: RuleConditionsInputDto

  @ApiProperty({ type: RuleActionsInputDto, description: 'At least one action.' })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RuleActionsInputDto)
  actions: RuleActionsInputDto

  @ApiPropertyOptional({ enum: STATUSES, default: 'enabled' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: 'enabled' | 'disabled'
}

export class UpdateExpenseRuleDto {
  @ApiPropertyOptional({ type: RuleConditionsInputDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RuleConditionsInputDto)
  conditions?: RuleConditionsInputDto

  @ApiPropertyOptional({ type: RuleActionsInputDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RuleActionsInputDto)
  actions?: RuleActionsInputDto

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: 'enabled' | 'disabled'

  @ApiProperty({ description: 'Current version; a stale version returns 409.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number
}

export class ExpenseRuleResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ enum: ['default', 'learned', 'user'] }) origin: 'default' | 'learned' | 'user'
  @ApiProperty({ enum: STATUSES }) status: 'enabled' | 'disabled'
  @ApiProperty({ type: RuleConditionsInputDto }) conditions: RuleConditionsInputDto
  @ApiProperty({ type: RuleActionsInputDto }) actions: RuleActionsInputDto
  @ApiProperty({ nullable: true, example: 'VND' }) currency: string | null
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence: number
  @ApiProperty() support: number
  @ApiProperty({ nullable: true, format: 'date-time' }) lastUsedAt: string | null
  @ApiProperty() version: number
  @ApiProperty({ format: 'date-time' }) createdAt: string
  @ApiProperty({ format: 'date-time' }) updatedAt: string
}
