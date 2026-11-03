import { Controller, Get, Headers, Res, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiHeader,
  ApiNotModifiedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../../auth/interface'
import { SuggestionConfigResponseDto } from '../dtos/suggestion-config.dto'
import { etagMatches, SuggestionConfigService } from '../services/suggestion-config.service'

@ApiTags('suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suggestion-config')
export class SuggestionConfigController {
  constructor(private readonly config: SuggestionConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the photo suggestion snapshot',
    description:
      'Returns image types, enabled personal choices and rules, default rules, thresholds, decision image parameters, and feature flags for the account. Send the ETag back in If-None-Match to receive 304 when nothing changed.',
  })
  @ApiHeader({ name: 'If-None-Match', required: false })
  @ApiOkResponse({ type: SuggestionConfigResponseDto })
  @ApiNotModifiedResponse({ description: 'The cached snapshot is current.' })
  async get(
    @CurrentUser() user: AuthUser,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuggestionConfigResponseDto | undefined> {
    const snapshot = await this.config.snapshot(user.id)
    res.setHeader('ETag', snapshot.etag)
    res.setHeader('Cache-Control', 'private, no-cache')
    if (etagMatches(ifNoneMatch, snapshot.etag)) {
      res.status(304)
      return undefined
    }
    return snapshot
  }
}
