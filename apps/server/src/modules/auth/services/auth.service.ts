import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import QRCode from 'qrcode'
import { authConfig, type AuthConfig } from '../../../configs/app.config'
import type { UserEntity } from '../../user/entities/user.entity'
import { UsersService } from '../../user/service'
import {
  MfaMethod,
  RegistrationContactMethod,
  type AuthResponseDto,
  type ChangePasswordDto,
  type LoginDto,
  type RegisterDto,
  type ResetPasswordDto,
} from '../dto'
import { OtpService } from './otp.service'
import { createTotpUri, generateTotpSecret, verifyTotp } from '../utils/totp'

const HASH_ROUNDS = 12

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly otp?: OtpService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const verified = await this.registrationVerification(input.verificationTokens ?? [])
    const emailVerified = verified.has(`email:${input.email}`)
    const phoneVerified = input.phoneNumber ? verified.has(`phone:${input.phoneNumber}`) : false
    this.assertRegistrationPolicy(emailVerified, phoneVerified)
    return this.authResponse(
      await this.users.create({
        username: input.username,
        email: input.email,
        phoneNumber: input.phoneNumber,
        displayName: input.displayName,
        passwordHash: await hash(input.password, HASH_ROUNDS),
        emailVerified,
        phoneNumberVerified: phoneVerified,
      }),
      false,
    )
  }

  registrationAvailability(email?: string, phoneNumber?: string, username?: string) {
    if (!email && !phoneNumber && !username)
      throw new BadRequestException('Email, phone number, or username is required')
    return this.users.availability(email, phoneNumber, username)
  }

  async requestRegistrationVerification(
    method: RegistrationContactMethod,
    email?: string,
    phoneNumber?: string,
  ) {
    const destination =
      method === RegistrationContactMethod.Email ? email?.trim().toLowerCase() : phoneNumber?.trim()
    if (!destination) throw new BadRequestException(`${method} is required`)
    const availability = await this.users.availability(email, phoneNumber)
    if (method === RegistrationContactMethod.Email && availability.emailAvailable === false)
      throw new BadRequestException('Email is already in use')
    if (method === RegistrationContactMethod.Phone && availability.phoneNumberAvailable === false)
      throw new BadRequestException('Phone number is already in use')
    return this.requireOtp().issue(
      destination,
      method === RegistrationContactMethod.Email ? 'registration_email' : 'registration_phone',
      null,
    )
  }

  async confirmRegistrationVerification(
    method: RegistrationContactMethod,
    code: string,
    email?: string,
    phoneNumber?: string,
  ) {
    const destination =
      method === RegistrationContactMethod.Email ? email?.trim().toLowerCase() : phoneNumber?.trim()
    if (!destination) throw new BadRequestException(`${method} is required`)
    const purpose =
      method === RegistrationContactMethod.Email ? 'registration_email' : 'registration_phone'
    await this.requireOtp().verify(destination, purpose, code)
    return {
      verificationToken: await this.jwt.signAsync(
        { purpose: 'registration_verified', method, destination },
        { expiresIn: '10m' },
      ),
      expiresIn: 600,
    }
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByLoginIdentifierWithPassword(input.identifier)
    if (!user || !(await compare(input.password, user.passwordHash)))
      throw new UnauthorizedException('Identifier or password is incorrect')
    return this.authResponse(user, user.mfaMethods.length > 0)
  }

  async currentUser(userId: string) {
    return this.users.toResponse(await this.users.findById(userId))
  }

  async changePassword(userId: string, input: ChangePasswordDto) {
    const user = await this.users.findAuthFields(userId)
    if (!(await compare(input.currentPassword, user.passwordHash)))
      throw new BadRequestException('Current password is incorrect')
    await this.users.updateSecurity(userId, {
      passwordHash: await hash(input.newPassword, HASH_ROUNDS),
    })
    return { success: true as const }
  }

  async requestEmailVerification(userId: string) {
    const user = await this.users.findById(userId)
    if (user.emailVerified) throw new BadRequestException('Email is already verified')
    return this.requireOtp().issue(user.email, 'email_verification', userId)
  }

  async confirmEmailVerification(userId: string, code: string) {
    const user = await this.users.findById(userId)
    await this.requireOtp().verify(user.email, 'email_verification', code, userId)
    await this.users.updateSecurity(userId, { emailVerified: true })
    return { success: true as const }
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmailWithPassword(email)
    if (user?.emailVerified) await this.requireOtp().issue(user.email, 'password_reset', user.id)
    return { expiresIn: 300 }
  }

  async resetPassword(input: ResetPasswordDto) {
    const user = await this.users.findByEmailWithPassword(input.email)
    if (!user?.emailVerified)
      throw new BadRequestException('Verification code is invalid or expired')
    await this.requireOtp().verify(user.email, 'password_reset', input.code, user.id)
    await this.users.updateSecurity(user.id, {
      passwordHash: await hash(input.newPassword, HASH_ROUNDS),
    })
    return { success: true as const }
  }

  async mfaMethods(userId: string) {
    const user = await this.users.findAuthFields(userId)
    return {
      enabled: user.mfaMethods,
      available: [MfaMethod.Authenticator, ...(user.emailVerified ? [MfaMethod.Email] : [])],
    }
  }

  async requestMfaEnrollment(userId: string, method: MfaMethod) {
    const user = await this.users.findAuthFields(userId)
    if (user.mfaMethods.includes(method))
      throw new BadRequestException('MFA method is already enabled')
    if (method === MfaMethod.Email) {
      if (!user.emailVerified)
        throw new BadRequestException('Verify your email before enabling email MFA')
      return this.requireOtp().issue(user.email, 'mfa_enroll', userId)
    }
    const secret = generateTotpSecret()
    await this.users.updateSecurity(userId, { authenticatorSecret: secret })
    return { secret, qrCode: await QRCode.toDataURL(createTotpUri(secret, user.email)) }
  }

  async confirmMfaEnrollment(userId: string, method: MfaMethod, code: string) {
    const user = await this.users.findAuthFields(userId)
    await this.verifyMethod(user, method, code, 'mfa_enroll')
    await this.users.updateSecurity(userId, {
      mfaMethods: [...new Set([...user.mfaMethods, method])],
    })
    return { success: true as const }
  }

  async requestMfaChallenge(
    userId: string,
    method: MfaMethod,
    purpose: 'mfa_login' | 'mfa_disable' = 'mfa_login',
  ) {
    const user = await this.requireEnabled(userId, method)
    if (method === MfaMethod.Authenticator)
      throw new BadRequestException('Submit the authenticator code directly')
    return this.requireOtp().issue(user.email, purpose, userId)
  }

  async verifyMfa(userId: string, method: MfaMethod, code: string): Promise<AuthResponseDto> {
    const user = await this.requireEnabled(userId, method)
    await this.verifyMethod(user, method, code, 'mfa_login')
    return this.authResponse(user, false)
  }

  async disableMfa(userId: string, method: MfaMethod, code: string) {
    const user = await this.requireEnabled(userId, method)
    await this.verifyMethod(user, method, code, 'mfa_disable')
    await this.users.updateSecurity(userId, {
      mfaMethods: user.mfaMethods.filter((item) => item !== method),
      ...(method === MfaMethod.Authenticator ? { authenticatorSecret: null } : {}),
    })
    return { success: true as const }
  }

  private async verifyMethod(
    user: UserEntity,
    method: MfaMethod,
    code: string,
    purpose: 'mfa_enroll' | 'mfa_login' | 'mfa_disable',
  ) {
    if (method === MfaMethod.Email)
      return this.requireOtp().verify(user.email, purpose, code, user.id)
    if (!user.authenticatorSecret || !verifyTotp(user.authenticatorSecret, code))
      throw new BadRequestException('Authenticator code is invalid')
  }

  private async requireEnabled(userId: string, method: MfaMethod) {
    const user = await this.users.findAuthFields(userId)
    if (!user.mfaMethods.includes(method))
      throw new BadRequestException('MFA method is not enabled')
    return user
  }

  private requireOtp(): OtpService {
    if (!this.otp) throw new Error('OTP delivery is unavailable')
    return this.otp
  }

  private assertRegistrationPolicy(emailVerified: boolean, phoneVerified: boolean): void {
    const policy = this.config.registrationVerificationPolicy
    const allowed =
      policy === 'none' ||
      (policy === 'email' && emailVerified) ||
      (policy === 'phone' && phoneVerified) ||
      (policy === 'one_of' && (emailVerified || phoneVerified)) ||
      (policy === 'both' && emailVerified && phoneVerified)
    if (!allowed) {
      throw new BadRequestException(`Registration verification policy '${policy}' is not satisfied`)
    }
  }

  private async registrationVerification(tokens: string[]): Promise<Set<string>> {
    const verified = new Set<string>()
    for (const token of tokens) {
      try {
        const payload = await this.jwt.verifyAsync<{
          purpose: string
          method: RegistrationContactMethod
          destination: string
        }>(token)
        if (payload.purpose !== 'registration_verified') throw new Error('Wrong token purpose')
        verified.add(`${payload.method}:${payload.destination}`)
      } catch {
        throw new BadRequestException('Registration verification token is invalid or expired')
      }
    }
    return verified
  }

  private async authResponse(user: UserEntity, requiresMfa: boolean): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync(
      { email: user.email, purpose: requiresMfa ? 'mfa_pending' : 'access' },
      { subject: user.id, ...(requiresMfa ? { expiresIn: '5m' } : {}) },
    )
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: requiresMfa ? 300 : ttlSeconds(this.config.accessTokenTtl),
      user: this.users.toResponse(user),
      requiresMfa,
      mfaMethods: user.mfaMethods as MfaMethod[],
    }
  }
}

function ttlSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl)
  return match ? Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1) : 900
}
