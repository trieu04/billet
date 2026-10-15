import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'
import { JobStatus } from './entities/recognition-job.entity'
export class CreateRecognitionDto {
  @ApiProperty() @Matches(/^[1-9]\d*$/) mediaAssetId: string
}

export class RecognitionSuggestionDto {
  @ApiProperty({ required: false }) amountMinor?: string
  @ApiProperty({ required: false }) currency?: string
  @ApiProperty({ required: false }) merchant?: string
  @ApiProperty({ required: false, format: 'date-time' }) occurredAt?: string
  @ApiProperty({ required: false }) categoryCode?: string
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  confidence: Record<string, number>
}

export class RecognitionResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) mediaAssetId: string
  @ApiProperty({ enum: JobStatus }) status: JobStatus
  @ApiProperty() provider: string
  @ApiProperty({ type: RecognitionSuggestionDto, nullable: true })
  suggestion: RecognitionSuggestionDto | null
  @ApiProperty() attempts: number
  @ApiProperty({ nullable: true }) failureReason: string | null
  @ApiProperty({ format: 'date-time' }) createdAt: string
  @ApiProperty({ format: 'date-time' }) updatedAt: string
}
