import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MfaMethod } from './dto'

export class RegistrationAvailabilityResponseDto {
  @ApiPropertyOptional({ nullable: true, example: true })
  usernameAvailable: boolean | null

  @ApiPropertyOptional({ nullable: true, example: true })
  emailAvailable: boolean | null

  @ApiPropertyOptional({ nullable: true, example: null })
  phoneNumberAvailable: boolean | null
}

export class VerificationChallengeResponseDto {
  @ApiProperty({
    description: 'Number of seconds before the verification code expires',
    example: 300,
  })
  expiresIn: number
}

export class RegistrationVerificationResponseDto {
  @ApiProperty({
    description: 'Short-lived token to include in verificationTokens when registering',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.registration-verification',
  })
  verificationToken: string

  @ApiProperty({
    description: 'Number of seconds before the verification token expires',
    example: 600,
  })
  expiresIn: number
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: true
}

export class MfaMethodsResponseDto {
  @ApiProperty({ isArray: true, enum: MfaMethod, example: [MfaMethod.Authenticator] })
  enabled: MfaMethod[]

  @ApiProperty({
    isArray: true,
    enum: MfaMethod,
    example: [MfaMethod.Authenticator, MfaMethod.Email],
  })
  available: MfaMethod[]
}

export class MfaEnrollmentResponseDto {
  @ApiPropertyOptional({
    description: 'Returned for email enrollment; number of seconds before the code expires',
    example: 300,
  })
  expiresIn?: number

  @ApiPropertyOptional({
    description: 'Returned for authenticator enrollment; Base32 TOTP secret',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret?: string

  @ApiPropertyOptional({
    description: 'Returned for authenticator enrollment; QR code as a data URL',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCode?: string
}
