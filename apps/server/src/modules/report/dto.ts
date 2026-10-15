import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
export class ReportQueryDto {
  @ApiProperty() @IsDateString() from: string
  @ApiProperty() @IsDateString() to: string
  @ApiProperty() @Matches(/^[A-Z]{3}$/) currency: string
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) @IsString() @MaxLength(64) timezone: string
  @ApiPropertyOptional({ enum: ['day', 'month'] })
  @IsOptional()
  @IsIn(['day', 'month'])
  granularity: 'day' | 'month' = 'day'
}

export class ReportRangeDto {
  @ApiProperty({ format: 'date-time' }) from: string
  @ApiProperty({ format: 'date-time' }) to: string
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) timezone: string
}

export class ReportComparisonDto {
  @ApiProperty({ format: 'date-time' }) from: string
  @ApiProperty({ format: 'date-time' }) to: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
  @ApiProperty({ nullable: true, description: 'Percentage change from the comparison period.' })
  changePercent: number | null
}

export class ReportSeriesPointDto {
  @ApiProperty({ example: '2026-10-15' }) bucket: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
}

export class ReportCategoryDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) categoryId: string
  @ApiProperty() code: string
  @ApiProperty() name: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
  @ApiProperty({ nullable: true }) sharePercent: number | null
}

export class ReportInsightDto {
  @ApiProperty({ enum: ['highest_spend_day'] }) type: 'highest_spend_day'
  @ApiProperty({ format: 'date' }) date: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) amountMinor: string
}

export class SpendingReportResponseDto {
  @ApiProperty({ type: ReportRangeDto }) range: ReportRangeDto
  @ApiProperty({ example: 'VND' }) currency: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) totalMinor: string
  @ApiProperty() count: number
  @ApiProperty({ type: ReportComparisonDto }) comparison: ReportComparisonDto
  @ApiProperty({ type: [ReportSeriesPointDto] }) series: ReportSeriesPointDto[]
  @ApiProperty({ type: [ReportCategoryDto] }) categories: ReportCategoryDto[]
  @ApiProperty({ type: [ReportInsightDto] }) insights: ReportInsightDto[]
}
