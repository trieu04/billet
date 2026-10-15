import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { CreateExportDto, ExportResponseDto } from './dto'
import { ExportService } from './service'
@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}
  @Post()
  @ApiOperation({
    summary: 'Create an expense export',
    description:
      'Creates a CSV export job for the authenticated account using the optional date and currency filters.',
  })
  @ApiCreatedResponse({ type: ExportResponseDto })
  create(@CurrentUser() u: AuthUser, @Body() b: CreateExportDto) {
    return this.exports.create(u.id, b)
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get an export job',
    description: 'Returns the current status and metadata of an expense export job.',
  })
  @ApiOkResponse({ type: ExportResponseDto })
  get(@CurrentUser() u: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.exports.get(u.id, id)
  }
  @Get(':id/download')
  @ApiOperation({
    summary: 'Download an expense export',
    description:
      'Streams the CSV file for a completed export job owned by the authenticated account.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'UTF-8 CSV export.',
    schema: { type: 'string', format: 'binary' },
  })
  async download(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Res() res: Response,
  ) {
    const stream = await this.exports.download(u.id, id)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="billet-export-${id}.csv"`)
    stream.pipe(res)
  }
}
