import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { BudgetQueryDto, SetBudgetDto } from './dto'
import { BudgetService } from './service'
@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgets: BudgetService) {}
  @Put()
  @ApiOperation({
    summary: 'Set a monthly spending budget',
    description:
      'Creates or replaces the authenticated account budget for the supplied month and currency.',
  })
  set(@CurrentUser() u: AuthUser, @Body() b: SetBudgetDto) {
    return this.budgets.set(u.id, b.month, b.currency, b.limitMinor)
  }
  @Get()
  @ApiOperation({
    summary: 'Get a monthly spending budget',
    description:
      'Returns the authenticated account budget and current spending for the supplied month and currency.',
  })
  get(@CurrentUser() u: AuthUser, @Query() q: BudgetQueryDto) {
    return this.budgets.get(u.id, q.month, q.currency)
  }
}
