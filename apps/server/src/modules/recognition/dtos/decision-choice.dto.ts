import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import { IMAGE_TYPE_KEYS } from '../constants'
import { PLACE_KEY_REGEX } from '../utils/keys'

const STATUSES = ['enabled', 'disabled'] as const

export class CreateDecisionChoiceDto {
  @ApiProperty({ maxLength: 80, example: 'Gửi xe – Tòa A' })
  @IsString()
  @MaxLength(80)
  @Matches(/\S/, { message: 'label must not be blank' })
  label: string

  @ApiPropertyOptional({
    maxLength: 240,
    nullable: true,
    description: 'Visual cues for the model.',
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(240)
  description?: string | null

  @ApiPropertyOptional({ enum: IMAGE_TYPE_KEYS, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsIn(IMAGE_TYPE_KEYS)
  imageType?: string | null

  @ApiPropertyOptional({ pattern: PLACE_KEY_REGEX.source, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Matches(PLACE_KEY_REGEX)
  placeKey?: string | null

  @ApiPropertyOptional({
    maxLength: 160,
    nullable: true,
    description: 'Merchant name or key; the server normalizes it.',
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(160)
  merchantKey?: string | null

  @ApiPropertyOptional({ enum: STATUSES, default: 'enabled' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: 'enabled' | 'disabled'
}

export class UpdateDecisionChoiceDto extends PartialType(CreateDecisionChoiceDto) {
  @ApiProperty({ description: 'Current version; a stale version returns 409.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number
}

export class DecisionChoiceResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ enum: ['image_type', 'personal'] }) kind: 'image_type' | 'personal'
  @ApiProperty({ nullable: true, description: 'Image type key for system image types.' })
  key: string | null
  @ApiProperty() label: string
  @ApiProperty({ nullable: true }) description: string | null
  @ApiProperty({ enum: IMAGE_TYPE_KEYS, nullable: true }) imageType: string | null
  @ApiProperty({ nullable: true }) placeKey: string | null
  @ApiProperty({ nullable: true }) merchantKey: string | null
  @ApiProperty({ enum: ['system', 'learned', 'user'] }) origin: 'system' | 'learned' | 'user'
  @ApiProperty({ enum: STATUSES }) status: 'enabled' | 'disabled'
  @ApiProperty() support: number
  @ApiProperty({ nullable: true, format: 'date-time' }) lastSelectedAt: string | null
  @ApiProperty() version: number
  @ApiProperty({ format: 'date-time' }) createdAt: string
  @ApiProperty({ format: 'date-time' }) updatedAt: string
}
