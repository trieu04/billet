import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { PLACE_KEY_REGEX } from '../utils/keys'

/** Text fields of the multipart `POST /expense-inferences` request. */
export class CreateInferenceDto {
  @ApiProperty({
    description: 'Client-generated id of this photo; repeating it returns the stored result.',
    pattern: '^[A-Za-z0-9._:-]{8,100}$',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,100}$/)
  clientRequestId: string

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) @IsString() @MaxLength(64) timezone: string

  @ApiProperty({ example: 'vi-VN' })
  @IsString()
  @Matches(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/)
  locale: string

  @ApiPropertyOptional({
    description: '7-character geohash of the capture location; ignored unless location use is on.',
    pattern: PLACE_KEY_REGEX.source,
  })
  @IsOptional()
  @Matches(PLACE_KEY_REGEX)
  placeKey?: string
}

/** Multipart schema for OpenAPI (the image is handled by the file interceptor). */
export class CreateInferenceMultipartDto extends CreateInferenceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Compressed JPEG photo, at most EXPENSE_DECISION_MAX_IMAGE_BYTES (1 MB).',
  })
  image: unknown
}

export class InferenceSelectionDto {
  @ApiProperty({
    description:
      'Image type key (for example `parking_ticket`) for `imageType`; bigint string id for `category` and `personalChoice`.',
  })
  id: string

  @ApiProperty({ minimum: 0, maximum: 1 }) confidence: number
}

export class InferenceResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string

  @ApiProperty({ enum: ['succeeded', 'unavailable', 'disabled'] })
  status: 'succeeded' | 'unavailable' | 'disabled'

  @ApiPropertyOptional({
    description:
      'Why no selection is available: `timeout`, `deadline`, `provider_rate_limited`, `provider_error`, `invalid_output`, `cancelled`, `provider_disabled`, or `suggestions_disabled`.',
  })
  reason?: string

  @ApiProperty({ description: 'Hash of the offered choice set; empty when none was built.' })
  choiceSetVersion: string

  @ApiProperty({ type: InferenceSelectionDto, nullable: true })
  imageType: InferenceSelectionDto | null

  @ApiProperty({ type: InferenceSelectionDto, nullable: true })
  category: InferenceSelectionDto | null

  @ApiProperty({ type: InferenceSelectionDto, nullable: true })
  personalChoice: InferenceSelectionDto | null

  @ApiProperty({ example: 'google-ai-studio' }) provider: string
  @ApiProperty({ example: 'gemini-2.5-flash' }) model: string
  @ApiProperty() latencyMs: number
}
