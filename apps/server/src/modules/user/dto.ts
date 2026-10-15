import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { Appearance } from './entities/user-settings.entity'

export class UserResponseDto {
  @ApiProperty({ example: 'ntdm11' })
  username: string

  @ApiProperty({ type: String, pattern: '^[1-9]\\d*$', example: '42' })
  id: string

  @ApiProperty({ example: 'trieu@example.com' })
  email: string

  @ApiProperty({ example: true })
  emailVerified: boolean

  @ApiPropertyOptional({ nullable: true, example: '+84901234567' })
  phoneNumber: string | null

  @ApiProperty({ example: false })
  phoneNumberVerified: boolean

  @ApiProperty({ example: 'Trieu' })
  displayName: string

  @ApiProperty({ format: 'date-time', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency?: string
  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string
  @ApiPropertyOptional({ example: 'vi' }) @IsOptional() @IsString() @MaxLength(16) locale?: string
  @ApiPropertyOptional({ enum: Appearance })
  @IsOptional()
  @IsEnum(Appearance)
  appearance?: Appearance
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reminderEnabled?: boolean
  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  reminderTime?: string
}
export class UserSettingsResponseDto {
  @ApiProperty() id: string
  @ApiProperty() defaultCurrency: string
  @ApiProperty() timezone: string
  @ApiProperty() locale: string
  @ApiProperty({ enum: Appearance }) appearance: Appearance
  @ApiProperty() reminderEnabled: boolean
  @ApiProperty({ nullable: true }) reminderTime: string | null
}
export class ProfileResponseDto extends UserResponseDto {
  @ApiProperty({ type: UserSettingsResponseDto }) settings: UserSettingsResponseDto
  @ApiProperty() expenseCount: number
}
