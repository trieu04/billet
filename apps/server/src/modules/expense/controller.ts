import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import {
  CalendarQueryDto,
  CreateExpenseDto,
  ExpenseCalendarResponseDto,
  ExpenseListResponseDto,
  ExpenseQueryDto,
  ExpenseResponseDto,
  UpdateExpenseDto,
} from './dto'
import { ExpenseService } from './service'
@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenses: ExpenseService) {}
  @Post()
  @ApiOperation({
    summary: 'Create an expense',
    description:
      'Adds an expense to the authenticated account. Reusing the same idempotency key returns the original expense instead of creating a duplicate.',
  })
  @ApiCreatedResponse({ type: ExpenseResponseDto })
  create(@CurrentUser() u: AuthUser, @Body() b: CreateExpenseDto) {
    return this.expenses.create(u.id, b)
  }
  @Get()
  @ApiOperation({
    summary: 'List expenses',
    description:
      'Returns the authenticated account expenses using cursor pagination and optional date and currency filters.',
  })
  @ApiOkResponse({ type: ExpenseListResponseDto })
  list(@CurrentUser() u: AuthUser, @Query() q: ExpenseQueryDto) {
    return this.expenses.list(u.id, q)
  }
  @Get('calendar')
  @ApiOperation({
    summary: 'Get monthly calendar spending',
    description:
      'Groups expense totals by local calendar day for the supplied month, currency, and timezone.',
  })
  @ApiOkResponse({ type: ExpenseCalendarResponseDto })
  calendar(@CurrentUser() u: AuthUser, @Query() q: CalendarQueryDto) {
    return this.expenses.calendar(u.id, q.month, q.currency, q.timezone)
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get an expense',
    description: 'Returns one expense owned by the authenticated account.',
  })
  @ApiOkResponse({ type: ExpenseResponseDto })
  find(@CurrentUser() u: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.expenses.find(u.id, id)
  }
  @Patch(':id')
  @ApiOperation({
    summary: 'Update an expense',
    description:
      'Updates an expense owned by the authenticated account when the supplied version matches the current record.',
  })
  @ApiOkResponse({ type: ExpenseResponseDto })
  update(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Body() b: UpdateExpenseDto,
  ) {
    return this.expenses.update(u.id, id, b)
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an expense',
    description: 'Soft-deletes one expense owned by the authenticated account.',
  })
  @ApiNoContentResponse()
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.expenses.remove(u.id, id)
  }
}
