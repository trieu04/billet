import { Controller, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ParseBigIntPipe } from '../../../shared/pipes/parse-bigint.pipe'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { ExpenseService } from '../../expense/service'
import {
  AdminInferenceDetailDto,
  AdminInferencePageDto,
  AdminInferenceQueryDto,
  AdminSummaryDto,
  AdminSummaryQueryDto,
} from '../../recognition/dtos/admin.dto'
import { InferenceAdminService } from '../../recognition/services/inference-admin.service'
import { AdminGuard } from '../guards/admin.guard'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/recognition')
export class AdminRecognitionStatsController {
  constructor(
    private readonly inferences: InferenceAdminService,
    private readonly expenses: ExpenseService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Recognition statistics',
    description:
      'Volume, failures, latency, usage, and saved field outcomes for inferences created in the period. Contains no user content.',
  })
  @ApiOkResponse({ type: AdminSummaryDto })
  async summary(@Query() query: AdminSummaryQueryDto): Promise<AdminSummaryDto> {
    const range = this.inferences.resolveRange(query)
    const [summary, fieldOutcomes] = await Promise.all([
      this.inferences.summary(query, range),
      this.expenses.fieldOutcomes({ ...range, provider: query.provider, model: query.model }),
    ])
    return { ...summary, fieldOutcomes }
  }

  @Get('inferences')
  @ApiOperation({ summary: 'List de-identified inference records, newest first' })
  @ApiOkResponse({ type: AdminInferencePageDto })
  list(@Query() query: AdminInferenceQueryDto): Promise<AdminInferencePageDto> {
    return this.inferences.list(query)
  }

  @Get('inferences/:id')
  @ApiOperation({ summary: 'Get one de-identified inference record and its saved field outcomes' })
  @ApiOkResponse({ type: AdminInferenceDetailDto })
  async get(@Param('id', ParseBigIntPipe) id: string): Promise<AdminInferenceDetailDto> {
    const { inference, usage, imageBytes, choiceSetVersion } = await this.inferences.get(id)
    return {
      ...inference,
      usage,
      imageBytes,
      choiceSetVersion,
      linkedExpenses: await this.expenses.fieldsForInference(id),
    }
  }

  @Get('inferences/:id/linked-expenses/:index/photo')
  @ApiOperation({
    summary: 'Get the saved photo of a linked expense',
    description:
      'Streams the photo saved with the expense at this position in `linkedExpenses`. The image sent to the provider is not stored, so this can differ from it.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'Image bytes.', schema: { type: 'string', format: 'binary' } })
  async photo(
    @Param('id', ParseBigIntPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response,
  ) {
    const file = await this.expenses.openInferencePhoto(id, index)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Length', file.size)
    file.stream.once('error', () => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.removeHeader('Content-Length')
      res.status(404).json({ statusCode: 404, message: 'Photo not found' })
    })
    file.stream.pipe(res)
  }
}
