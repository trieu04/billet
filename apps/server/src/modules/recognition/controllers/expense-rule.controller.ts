import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../../auth/interface'
import {
  CreateExpenseRuleDto,
  ExpenseRuleResponseDto,
  UpdateExpenseRuleDto,
} from '../dtos/expense-rule.dto'
import { ExpenseRuleService } from '../services/expense-rule.service'

@ApiTags('suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense-rules')
export class ExpenseRuleController {
  constructor(private readonly rules: ExpenseRuleService) {}

  @Get()
  @ApiOperation({
    summary: 'List expense rules',
    description:
      'Returns the read-only system default rules followed by the account rules, including disabled ones.',
  })
  @ApiOkResponse({ type: [ExpenseRuleResponseDto] })
  list(@CurrentUser() user: AuthUser) {
    return this.rules.list(user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense rule' })
  @ApiCreatedResponse({ type: ExpenseRuleResponseDto })
  @ApiConflictResponse({
    description: 'A rule with the same conditions exists or the rule limit is reached.',
  })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateExpenseRuleDto) {
    return this.rules.create(user.id, input)
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an expense rule',
    description:
      'Applies the change when `version` matches. Editing a learned rule makes it a user rule that the learner no longer changes.',
  })
  @ApiOkResponse({ type: ExpenseRuleResponseDto })
  @ApiNotFoundResponse({ description: 'Not a rule of the account.' })
  @ApiConflictResponse({ description: 'Stale version or conditions already used.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Body() input: UpdateExpenseRuleDto,
  ) {
    return this.rules.update(user.id, id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an expense rule',
    description: 'The learner does not recreate a rule for the same conditions for 90 days.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not a rule of the account.' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.rules.remove(user.id, id)
  }
}
