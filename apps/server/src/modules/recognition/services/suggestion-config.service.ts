import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'node:crypto'
import { In, IsNull, Repository } from 'typeorm'
import { UsersService } from '../../user/service'
import { DECISION_IMAGE, SUGGESTION_THRESHOLDS } from '../constants'
import type {
  SuggestionConfigResponseDto,
  SuggestionChoiceDto,
  SuggestionRuleDto,
} from '../dtos/suggestion-config.dto'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ExpenseRuleEntity } from '../entities/expense-rule.entity'
import { ChoiceSetService } from './choice-set.service'
import { InferenceService } from './inference.service'

/** Builds the client snapshot served by `GET /suggestion-config`. */
@Injectable()
export class SuggestionConfigService {
  constructor(
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    @InjectRepository(ExpenseRuleEntity) private readonly rules: Repository<ExpenseRuleEntity>,
    private readonly choiceSets: ChoiceSetService,
    private readonly users: UsersService,
    private readonly inferences: InferenceService,
  ) {}

  async snapshot(userId: string): Promise<SuggestionConfigResponseDto> {
    const [imageTypes, personal, rules, defaults, settings] = await Promise.all([
      this.choiceSets.loadImageTypes(),
      this.choices.find({
        where: { userId, kind: 'personal', status: 'enabled' },
        order: { id: 'ASC' },
      }),
      this.rules.find({
        where: { userId, origin: In(['learned', 'user']), status: 'enabled' },
        order: { id: 'ASC' },
      }),
      this.rules.find({
        where: { userId: IsNull(), origin: 'default', status: 'enabled' },
        order: { id: 'ASC' },
      }),
      this.users.getSettings(userId),
    ])
    const body: Omit<SuggestionConfigResponseDto, 'etag'> = {
      imageTypes: imageTypes.map((type) =>
        type.description
          ? { key: type.key, label: type.label, description: type.description }
          : { key: type.key, label: type.label },
      ),
      choices: personal.map(toSnapshotChoice),
      rules: rules.map(toSnapshotRule),
      defaultRules: defaults.map(toSnapshotRule),
      thresholds: { ...SUGGESTION_THRESHOLDS },
      decisionImage: { ...DECISION_IMAGE },
      features: {
        suggestions: settings.suggestionsEnabled,
        ruleLearning: settings.ruleLearningEnabled,
        location: settings.suggestionLocationEnabled,
        decision: settings.suggestionsEnabled && this.inferences.providerEnabled,
      },
    }
    const etag = `"${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 32)}"`
    return { etag, ...body }
  }
}

/** True when an `If-None-Match` header matches the entity tag (weak comparison). */
export function etagMatches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false
  const strip = (value: string) => value.trim().replace(/^W\//, '')
  return ifNoneMatch
    .split(',')
    .map(strip)
    .some((candidate) => candidate === '*' || candidate === strip(etag))
}

function toSnapshotChoice(choice: DecisionChoiceEntity): SuggestionChoiceDto {
  const result: SuggestionChoiceDto = { id: choice.id, label: choice.label }
  if (choice.imageTypeKey) result.imageType = choice.imageTypeKey
  if (choice.placeKey) result.placeKey = choice.placeKey
  if (choice.merchantKey) result.merchantKey = choice.merchantKey
  return result
}

function toSnapshotRule(rule: ExpenseRuleEntity): SuggestionRuleDto {
  return {
    id: rule.id,
    origin: rule.origin,
    conditions: rule.conditions,
    actions: rule.actions,
    confidence: rule.confidence,
    updatedAt: rule.updatedAt.toISOString(),
  }
}
