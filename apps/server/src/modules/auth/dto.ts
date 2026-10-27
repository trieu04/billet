import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator'
import { UserResponseDto } from '../user/dto'

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'ntdm11',
    description: 'Optional public username; generated from email when omitted',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(/^[a-z][a-z0-9_]{2,29}$/)
  username?: string

  @ApiProperty({ example: 'trieu@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email: string

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber?: string

  @ApiPropertyOptional({
    type: [String],
    description: 'Tokens returned by registration verification confirm',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  verificationTokens?: string[]

  @ApiPropertyOptional({ example: 'Trieu', description: 'Defaults to the email local part' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string

  @ApiProperty({ example: 'Billet123', minLength: 8 })
  @IsString()
  @Length(8, 128)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must contain uppercase, lowercase, and numeric characters',
  })
  password: string
}

export class LoginDto {
  @ApiProperty({
    example: 'ntdm11',
    description: 'Username, email address, or E.164 phone number',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 320)
  @MaxLength(320)
  identifier: string

  @ApiProperty({ example: 'Billet123' })
  @IsString()
  @Length(1, 128)
  password: string
}

export class SocialLoginDto {
  @ApiProperty({ enum: ['google', 'apple'] })
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple'

  @ApiProperty({ description: 'OpenID Connect identity token returned by the provider' })
  @IsString()
  @Length(20, 8192)
  identityToken: string

  @ApiPropertyOptional({ description: 'Used on Apple’s first authorization response' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token' })
  accessToken: string

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer'

  @ApiProperty({ example: 900 })
  expiresIn: number

  @ApiPropertyOptional({
    description: 'Opaque rotating token; omitted until MFA is complete',
  })
  refreshToken?: string

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto

  @ApiProperty({ example: false })
  requiresMfa: boolean

  @ApiProperty({ isArray: true, enum: ['authenticator', 'email'], example: [] })
  mfaMethods: MfaMethod[]
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token returned by an authenticated session' })
  @IsString()
  @Length(40, 256)
  refreshToken: string
}

export enum MfaMethod {
  Authenticator = 'authenticator',
  Email = 'email',
}

export enum RegistrationContactMethod {
  Email = 'email',
  Phone = 'phone',
}

class RegistrationContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber?: string
}

export class RegistrationAvailabilityDto extends RegistrationContactDto {
  @ApiPropertyOptional({ example: 'ntdm11' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(/^[a-z][a-z0-9_]{2,29}$/)
  username?: string
}

export class RegistrationVerificationRequestDto extends RegistrationContactDto {
  @ApiProperty({ enum: RegistrationContactMethod })
  @IsEnum(RegistrationContactMethod)
  method: RegistrationContactMethod
}

export class RegistrationVerificationConfirmDto extends RegistrationVerificationRequestDto {
  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4}$/)
  code: string
}

export class EmailDto {
  @ApiProperty({ example: 'trieu@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email: string
}

export class ConfirmEmailDto extends EmailDto {
  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4}$/)
  code: string
}

export class VerificationCodeDto {
  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4}$/)
  code: string
}

export class ResetPasswordDto extends ConfirmEmailDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @Length(8, 128)
  @Matches(PASSWORD_PATTERN)
  newPassword: string
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @Length(1, 128)
  currentPassword: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @Length(8, 128)
  @Matches(PASSWORD_PATTERN)
  newPassword: string
}

export class MfaMethodDto {
  @ApiProperty({ enum: MfaMethod })
  @IsEnum(MfaMethod)
  method: MfaMethod
}

export class VerifyMfaDto extends MfaMethodDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^(?:\d{4}|\d{6})$/)
  code: string
}
