import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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
