import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator'
import { MediaStatus } from './entities/media-asset.entity'
export class CreateMediaDto {
  @ApiProperty() @IsString() @MaxLength(100) mimeType: string
  @ApiProperty() @IsInt() @Min(1) @Max(15_000_000) sizeBytes: number
}
export class MediaResponseDto {
  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$' }) id: string
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] }) mimeType: string
  @ApiProperty({ type: String, pattern: '^\\d+$' }) sizeBytes: string
  @ApiProperty({ enum: MediaStatus }) status: MediaStatus
  @ApiPropertyOptional({ nullable: true }) width: number | null
  @ApiPropertyOptional({ nullable: true }) height: number | null
  @ApiProperty({ format: 'date-time' }) expiresAt: string
  @ApiPropertyOptional({ nullable: true }) failureReason: string | null
}

export class CreateMediaResponseDto extends MediaResponseDto {
  @ApiProperty({ example: '/api/v1/media/42/content' }) uploadUrl: string
}
