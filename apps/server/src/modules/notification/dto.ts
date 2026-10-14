import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { PushPlatform } from './entities/push-device.entity'

export class RegisterPushDeviceDto {
  @ApiProperty({ maxLength: 2048 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string

  @ApiProperty({ enum: PushPlatform })
  @IsEnum(PushPlatform)
  platform: PushPlatform
}

export class UnregisterPushDeviceDto {
  @ApiProperty({ maxLength: 2048 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 20, maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20
}

export class NotificationResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$', example: '42' })
  id: string

  @ApiProperty({ example: 'expense.processed' })
  type: string

  @ApiProperty({ example: 'Receipt processed' })
  title: string

  @ApiProperty({ example: 'Your receipt is ready to review.' })
  body: string

  @ApiProperty({ type: Object })
  metadata: Record<string, unknown>

  @ApiProperty()
  isRead: boolean

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt: string | null

  @ApiProperty({ format: 'date-time' })
  createdAt: string
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[]

  @ApiProperty({ example: 1 })
  page: number

  @ApiProperty({ example: 20 })
  limit: number

  @ApiProperty({ example: 42 })
  total: number
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count: number
}

export class MarkAllReadResponseDto {
  @ApiProperty({ example: 3 })
  updatedCount: number
}
