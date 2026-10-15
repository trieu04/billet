import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { ReportQueryDto, SpendingReportResponseDto } from './dto'
import { ReportService } from './service'
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reports: ReportService) {}
  @Get('spending')
  @ApiOperation({
    summary: 'Get a spending report',
    description:
      'Returns totals, category breakdowns, and a time series for the requested date range, currency, timezone, and granularity.',
  })
  @ApiOkResponse({ type: SpendingReportResponseDto })
  get(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.reports.get(u.id, q)
  }
}
