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
  CreateDecisionChoiceDto,
  DecisionChoiceResponseDto,
  UpdateDecisionChoiceDto,
} from '../dtos/decision-choice.dto'
import { DecisionChoiceService } from '../services/decision-choice.service'

@ApiTags('suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decision-choices')
export class DecisionChoiceController {
  constructor(private readonly choices: DecisionChoiceService) {}

  @Get()
  @ApiOperation({
    summary: 'List decision choices',
    description:
      'Returns the read-only system image types followed by the account personal choices, including disabled ones.',
  })
  @ApiOkResponse({ type: [DecisionChoiceResponseDto] })
  list(@CurrentUser() user: AuthUser) {
    return this.choices.list(user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a personal decision choice' })
  @ApiCreatedResponse({ type: DecisionChoiceResponseDto })
  @ApiConflictResponse({ description: 'The personal choice limit is reached.' })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateDecisionChoiceDto) {
    return this.choices.create(user.id, input)
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a personal decision choice',
    description:
      'Applies the change when `version` matches. Editing a learned choice makes it a user choice that the learner no longer changes.',
  })
  @ApiOkResponse({ type: DecisionChoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Not a personal choice of the account.' })
  @ApiConflictResponse({ description: 'Stale version.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Body() input: UpdateDecisionChoiceDto,
  ) {
    return this.choices.update(user.id, id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a personal decision choice',
    description: 'The learner does not recreate a choice for the same key for 90 days.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not a personal choice of the account.' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.choices.remove(user.id, id)
  }
}
