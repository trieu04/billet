import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { isImageTypeKey } from '../constants'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ExpenseInferenceEntity } from '../entities/expense-inference.entity'
import {
  fieldSourcesFromProvenance,
  parseFieldProvenance,
  type FieldProvenanceMap,
} from '../utils/field-provenance'
import { isPlaceKey, toMerchantKey } from '../utils/keys'

/** Suggestion fields of an expense create/update request; `undefined` means "not provided". */
export interface ExpenseSuggestionInput {
  inferenceId?: string | null
  imageType?: string | null
  personalChoiceId?: string | null
  placeKey?: string | null
  merchantKey?: string | null
  fieldProvenance?: unknown
}

/** Validated, normalized fields; only those provided in the input are present. */
export interface ExpenseSuggestionFields {
  inferenceId?: string | null
  imageType?: string | null
  personalChoiceId?: string | null
  placeKey?: string | null
  merchantKey?: string | null
  fieldProvenance?: FieldProvenanceMap
  /** Legacy `fieldSources`, derived from `fieldProvenance` when it is provided. */
  fieldSources?: Record<string, string>
}

/** Validates the suggestion references an expense carries and normalizes its learning keys. */
@Injectable()
export class ExpenseSuggestionLinkService {
  constructor(
    @InjectRepository(ExpenseInferenceEntity)
    private readonly inferences: Repository<ExpenseInferenceEntity>,
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
  ) {}

  /**
   * `current` holds the stored values on update: unchanged references are not re-checked, so an
   * expense stays editable after its inference expired or its choice was deleted.
   */
  async resolve(
    userId: string,
    input: ExpenseSuggestionInput,
    current?: { inferenceId: string | null; personalChoiceId: string | null },
  ): Promise<ExpenseSuggestionFields> {
    const fields: ExpenseSuggestionFields = {}
    if (input.inferenceId !== undefined) {
      if (input.inferenceId && input.inferenceId !== current?.inferenceId) {
        const exists = await this.inferences.existsBy({ id: input.inferenceId, userId })
        if (!exists) throw new NotFoundException('Inference not found')
      }
      fields.inferenceId = input.inferenceId || null
    }
    if (input.personalChoiceId !== undefined) {
      if (input.personalChoiceId && input.personalChoiceId !== current?.personalChoiceId) {
        const exists = await this.choices.existsBy({
          id: input.personalChoiceId,
          userId,
          kind: 'personal',
        })
        if (!exists) throw new NotFoundException('Decision choice not found')
      }
      fields.personalChoiceId = input.personalChoiceId || null
    }
    if (input.imageType !== undefined) {
      if (input.imageType !== null && !isImageTypeKey(input.imageType))
        throw new BadRequestException('imageType is not a known image type')
      fields.imageType = input.imageType
    }
    if (input.placeKey !== undefined) {
      if (input.placeKey !== null && !isPlaceKey(input.placeKey))
        throw new BadRequestException('placeKey must be a 7-character geohash')
      fields.placeKey = input.placeKey
    }
    if (input.merchantKey !== undefined) fields.merchantKey = toMerchantKey(input.merchantKey)
    if (input.fieldProvenance !== undefined && input.fieldProvenance !== null) {
      const parsed = parseFieldProvenance(input.fieldProvenance)
      if (!parsed.ok) throw new BadRequestException(parsed.errors)
      fields.fieldProvenance = parsed.value
      fields.fieldSources = fieldSourcesFromProvenance(parsed.value)
    }
    return fields
  }
}
