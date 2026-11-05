import {
  HttpException,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { CategoryService } from '../../category/service'
import { PLAYGROUND_MAX_PER_MINUTE, SUGGESTION_THRESHOLDS } from '../constants'
import type { PlaygroundResponseDto } from '../dtos/admin.dto'
import { ExpenseRuleEntity } from '../entities/expense-rule.entity'
import { assembleChoiceSet } from '../utils/choice-set'
import { conditionsHash } from '../utils/conditions'
import { isJpeg } from '../utils/jpeg'
import { ChoiceSetService } from './choice-set.service'
import { InferenceService } from './inference.service'

const WINDOW_MS = 60_000

/**
 * Tries the configured provider on one operator-supplied image. Offers system image types and
 * categories only, stores nothing, and leaves inference records and learning untouched.
 */
@Injectable()
export class PlaygroundService {
  private readonly windows = new Map<string, { start: number; count: number }>()

  constructor(
    @InjectRepository(ExpenseRuleEntity) private readonly rules: Repository<ExpenseRuleEntity>,
    private readonly inferences: InferenceService,
    private readonly choiceSets: ChoiceSetService,
    private readonly categories: CategoryService,
  ) {}

  async run(
    adminUserId: string,
    image: Buffer,
    locale: string,
    signal: AbortSignal,
    now = Date.now(),
  ): Promise<PlaygroundResponseDto> {
    if (image.length > this.inferences.maxImageBytes)
      throw new PayloadTooLargeException('image is too large')
    if (!isJpeg(image)) throw new UnsupportedMediaTypeException('image must be a JPEG')
    this.consume(adminUserId, now)

    const [imageTypes, categories] = await Promise.all([
      this.choiceSets.loadImageTypes(),
      this.categories.listSystemCategories(),
    ])
    const active = categories.filter((category) => category.active)
    const choiceSet = assembleChoiceSet({
      imageTypes,
      categories: active.map((category) => ({ id: category.id, label: category.name })),
      personal: [],
      maxChoices: this.inferences.maxChoices,
    })
    const trial = await this.inferences.tryDecision(
      choiceSet,
      new Uint8Array(image.buffer, image.byteOffset, image.length),
      locale,
      signal,
    )

    const imageType = trial.selections?.imageType ?? null
    const category = trial.selections?.category ?? null
    const names = new Map(categories.map((item) => [item.id, item.name]))
    const rule = imageType
      ? await this.rules.findOneBy({
          origin: 'default',
          userId: IsNull(),
          status: 'enabled',
          conditionsHash: conditionsHash({ imageType: imageType.id }),
        })
      : null
    const response: PlaygroundResponseDto = {
      status: trial.status,
      provider: trial.provider,
      model: trial.model,
      latencyMs: trial.latencyMs,
      usage: trial.usage,
      imageBytes: image.length,
      choices: [
        ...choiceSet.choices.imageTypes.map((choice) => ({
          kind: 'image_type' as const,
          label: choice.label,
        })),
        ...choiceSet.choices.categories.map((choice) => ({
          kind: 'category' as const,
          label: choice.label,
        })),
      ],
      imageType: imageType
        ? {
            label: imageTypes.find((type) => type.key === imageType.id)?.label ?? imageType.id,
            confidence: imageType.confidence,
          }
        : null,
      category: category
        ? { label: names.get(category.id) ?? category.id, confidence: category.confidence }
        : null,
      categoryMeetsThreshold:
        category !== null && category.confidence >= SUGGESTION_THRESHOLDS.decisionCategory,
      defaultRule: rule
        ? {
            id: rule.id,
            categoryName: rule.actions.categoryId
              ? (names.get(rule.actions.categoryId) ?? null)
              : null,
            confidence: rule.confidence,
          }
        : null,
    }
    if (trial.reason) response.reason = trial.reason
    return response
  }

  private consume(adminUserId: string, now: number): void {
    const window = this.windows.get(adminUserId)
    if (!window || now - window.start >= WINDOW_MS) {
      this.windows.set(adminUserId, { start: now, count: 1 })
      return
    }
    if (window.count >= PLAYGROUND_MAX_PER_MINUTE)
      throw new HttpException('Playground limit reached', HttpStatus.TOO_MANY_REQUESTS)
    window.count += 1
  }
}
