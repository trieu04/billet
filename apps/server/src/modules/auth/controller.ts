import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { UserResponseDto } from '../user/dto'
import {
  AuthResponseDto,
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  MfaMethodDto,
  RegistrationAvailabilityDto,
  RegistrationVerificationConfirmDto,
  RegistrationVerificationRequestDto,
  RegisterDto,
  ResetPasswordDto,
  VerificationCodeDto,
  VerifyMfaDto,
} from './dto'
import type { AuthUser } from './interface'
import {
  MfaEnrollmentResponseDto,
  MfaMethodsResponseDto,
  RegistrationAvailabilityResponseDto,
  RegistrationVerificationResponseDto,
  SuccessResponseDto,
  VerificationChallengeResponseDto,
} from './response.dto'
import { CurrentUser } from './decorators/current-user.decorator'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { MfaPendingGuard } from './guards/mfa-pending.guard'
import { AuthService } from './services/auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create a Billet account',
    description:
      'Creates an account and returns an access token. Include the short-lived verification tokens required by the configured registration policy.',
  })
  @ApiCreatedResponse({ description: 'Account created and authenticated', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Registration data or verification token is invalid' })
  @ApiConflictResponse({
    description: 'Email, username, or phone number already belongs to an account',
  })
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(input)
  }

  @Post('register/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check registration identifier availability',
    description:
      'Checks whether an email address, phone number, or username can be used for a new account.',
  })
  @ApiOkResponse({
    description: 'Availability for each supplied identifier; omitted values are returned as null',
    type: RegistrationAvailabilityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'No valid email, phone number, or username was supplied' })
  registrationAvailability(@Body() input: RegistrationAvailabilityDto) {
    return this.auth.registrationAvailability(input.email, input.phoneNumber, input.username)
  }

  @Post('register/verification/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a registration verification code',
    description:
      'Sends a one-time code to the selected available email address or phone number. Codes expire after five minutes.',
  })
  @ApiOkResponse({ description: 'Verification code sent', type: VerificationChallengeResponseDto })
  @ApiBadRequestResponse({ description: 'The contact is missing, unavailable, or rate limited' })
  requestRegistrationVerification(@Body() input: RegistrationVerificationRequestDto) {
    return this.auth.requestRegistrationVerification(input.method, input.email, input.phoneNumber)
  }

  @Post('register/verification/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm a registration verification code',
    description:
      'Validates the one-time code and returns a short-lived verification token for the registration request.',
  })
  @ApiOkResponse({
    description: 'Contact verified; pass this token to POST /auth/register',
    type: RegistrationVerificationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Verification code is invalid or expired' })
  confirmRegistrationVerification(@Body() input: RegistrationVerificationConfirmDto) {
    return this.auth.confirmRegistrationVerification(
      input.method,
      input.code,
      input.email,
      input.phoneNumber,
    )
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with username, email, or phone number',
    description:
      'Authenticates the account using a username, email address, or E.164 phone number. When MFA is enabled, the returned token is limited to completing the MFA challenge.',
  })
  @ApiOkResponse({ description: 'Credentials accepted', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Identifier or password is incorrect' })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the authenticated account',
    description: 'Returns the profile associated with the bearer access token.',
  })
  @ApiOkResponse({ description: 'Authenticated account profile', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  currentUser(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.auth.currentUser(user.id)
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset code',
    description:
      'Sends a reset code when the email belongs to a verified account. The same response is returned when it does not, preventing account discovery.',
  })
  @ApiOkResponse({
    description: 'Password reset request accepted',
    type: VerificationChallengeResponseDto,
  })
  requestPasswordReset(@Body() input: EmailDto) {
    return this.auth.requestPasswordReset(input.email)
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset a forgotten password',
    description: 'Sets a new password after validating the reset code sent to the verified email.',
  })
  @ApiOkResponse({ description: 'Password reset successfully', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Verification code is invalid or expired' })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change the authenticated account password',
    description: 'Replaces the current password after checking the existing password.',
  })
  @ApiOkResponse({ description: 'Password changed successfully', type: SuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Current password is incorrect or new password is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  changePassword(@CurrentUser() user: AuthUser, @Body() input: ChangePasswordDto) {
    return this.auth.changePassword(user.id, input)
  }

  @Post('verification/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request an email verification code',
    description: 'Sends a one-time verification code to the authenticated account email.',
  })
  @ApiOkResponse({ description: 'Verification code sent', type: VerificationChallengeResponseDto })
  @ApiBadRequestResponse({
    description: 'Email is already verified or the request is rate limited',
  })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  requestVerification(@CurrentUser() user: AuthUser) {
    return this.auth.requestEmailVerification(user.id)
  }

  @Post('verification/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm the account email',
    description: 'Marks the authenticated account email as verified using its one-time code.',
  })
  @ApiOkResponse({ description: 'Email verified successfully', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Verification code is invalid or expired' })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  confirmVerification(@CurrentUser() user: AuthUser, @Body() input: VerificationCodeDto) {
    return this.auth.confirmEmailVerification(user.id, input.code)
  }

  @Get('mfa/methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List MFA methods',
    description:
      'Returns the MFA methods enabled for the account and those currently available to enroll.',
  })
  @ApiOkResponse({ description: 'Enabled and available MFA methods', type: MfaMethodsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  mfaMethods(@CurrentUser() user: AuthUser) {
    return this.auth.mfaMethods(user.id)
  }

  @Post('mfa/enroll/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start MFA enrollment',
    description:
      'Sends an email code or returns an authenticator secret and QR code, depending on the selected method.',
  })
  @ApiOkResponse({
    description: 'MFA enrollment challenge created',
    type: MfaEnrollmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'MFA method is unavailable or already enabled' })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  requestMfaEnrollment(@CurrentUser() user: AuthUser, @Body() input: MfaMethodDto) {
    return this.auth.requestMfaEnrollment(user.id, input.method)
  }

  @Post('mfa/enroll/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm MFA enrollment',
    description: 'Enables the selected MFA method after validating its enrollment code.',
  })
  @ApiOkResponse({ description: 'MFA method enabled', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Enrollment code is invalid or expired' })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  confirmMfaEnrollment(@CurrentUser() user: AuthUser, @Body() input: VerifyMfaDto) {
    return this.auth.confirmMfaEnrollment(user.id, input.method, input.code)
  }

  @Post('mfa/challenge')
  @UseGuards(MfaPendingGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request an MFA login challenge',
    description:
      'Sends a one-time code for email MFA. Authenticator codes can be submitted directly to the verify endpoint.',
  })
  @ApiOkResponse({ description: 'MFA challenge sent', type: VerificationChallengeResponseDto })
  @ApiBadRequestResponse({
    description: 'MFA method is unavailable or does not require a challenge',
  })
  @ApiUnauthorizedResponse({ description: 'MFA-pending bearer token is missing or invalid' })
  requestMfaChallenge(@CurrentUser() user: AuthUser, @Body() input: MfaMethodDto) {
    return this.auth.requestMfaChallenge(user.id, input.method)
  }

  @Post('mfa/verify')
  @UseGuards(MfaPendingGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete MFA login',
    description:
      'Validates the MFA code and exchanges the MFA-pending token for a full access token.',
  })
  @ApiOkResponse({ description: 'MFA verified and full access granted', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'MFA code is invalid or expired' })
  @ApiUnauthorizedResponse({ description: 'MFA-pending bearer token is missing or invalid' })
  verifyMfa(@CurrentUser() user: AuthUser, @Body() input: VerifyMfaDto) {
    return this.auth.verifyMfa(user.id, input.method, input.code)
  }

  @Post('mfa/disable/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request an MFA disable challenge',
    description:
      'Sends a one-time code before disabling email MFA. Authenticator codes can be submitted directly to the disable endpoint.',
  })
  @ApiOkResponse({
    description: 'MFA disable challenge sent',
    type: VerificationChallengeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'MFA method is unavailable or does not require a challenge',
  })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  requestMfaDisable(@CurrentUser() user: AuthUser, @Body() input: MfaMethodDto) {
    return this.auth.requestMfaChallenge(user.id, input.method, 'mfa_disable')
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable an MFA method',
    description: 'Disables the selected MFA method after validating its code.',
  })
  @ApiOkResponse({ description: 'MFA method disabled', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'MFA code is invalid or expired' })
  @ApiUnauthorizedResponse({ description: 'Bearer token is missing or invalid' })
  disableMfa(@CurrentUser() user: AuthUser, @Body() input: VerifyMfaDto) {
    return this.auth.disableMfa(user.id, input.method, input.code)
  }
}
