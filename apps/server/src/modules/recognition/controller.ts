import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { CreateRecognitionDto, RecognitionResponseDto } from './dto'
import { RecognitionService } from './service'
@ApiTags('recognition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recognition-jobs')
export class RecognitionController {
  constructor(private readonly recognition: RecognitionService) {}
  @Post()
  @ApiOperation({
    summary: 'Start receipt recognition',
    description:
      'Creates a recognition job for an uploaded receipt image owned by the authenticated account.',
  })
  @ApiCreatedResponse({ type: RecognitionResponseDto })
  create(@CurrentUser() u: AuthUser, @Body() b: CreateRecognitionDto) {
    return this.recognition.create(u.id, b.mediaAssetId)
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get a recognition job',
    description:
      'Returns recognition status and any extracted receipt fields for the requested job.',
  })
  @ApiOkResponse({ type: RecognitionResponseDto })
  get(@CurrentUser() u: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.recognition.get(u.id, id)
  }
}
