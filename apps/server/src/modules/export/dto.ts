import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator'
import { JobStatus } from '../recognition/entities/recognition-job.entity'
export class CreateExportDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string
}

export class ExportListQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit = 10
}

export class ExportResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ enum: JobStatus }) status: JobStatus
  @ApiProperty({ nullable: true, format: 'date-time' }) from: string | null
  @ApiProperty({ nullable: true, format: 'date-time' }) to: string | null
  @ApiProperty({ nullable: true, example: 'VND' }) currency: string | null
  @ApiProperty({ nullable: true, format: 'date-time' }) snapshotAt: string | null
  @ApiProperty({ nullable: true, format: 'date-time' }) downloadExpiresAt: string | null
  @ApiProperty({ nullable: true }) failureReason: string | null
  @ApiProperty({ format: 'date-time' }) createdAt: string
}
