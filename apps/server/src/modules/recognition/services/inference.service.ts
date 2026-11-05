import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { decisionConfig, type DecisionConfig } from '../../../configs/app.config'
import { UsersService } from '../../user/service'
import { MIN_PROVIDER_BUDGET_MS } from '../constants'
import { assertDecisionRefs } from '../decision-output'
import type { InferenceResponseDto } from '../dtos/inference.dto'
import {
  ExpenseInferenceEntity,
  type InferenceInput,
  type InferenceOutput,
  type InferenceSelections,
  type InferenceStatus,
  type InferenceUsage,
} from '../entities/expense-inference.entity'
import {
  DECISION_PROVIDER,
  DecisionProviderError,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
} from '../interface'
import {
  mapDecisionOutput,
  toInputSnapshot,
  toOutputSnapshot,
  type ChoiceSet,
} from '../utils/choice-set'
import { ChoiceSetService } from './choice-set.service'
import { DecisionMetricsService } from './decision-metrics.service'

export interface InferenceRequest {
  image: Uint8Array
  clientRequestId: string
  locale: string
  placeKey: string | null
  /** Remaining client budget from `X-Billet-Deadline-Ms`, if sent. */
  deadlineMs: number | null
  /** Aborted when the client disconnects. */
  signal: AbortSignal
  /** When the request reached the handler (ms epoch); the deadline counts from here. */
  receivedAt: number
}

interface Outcome {
  status: InferenceStatus
  reason: string | null
  choiceSetVersion: string
  selections: InferenceSelections | null
  usage: InferenceUsage | null
  latencyMs: number
  called: boolean
  input: InferenceInput | null
  output: InferenceOutput | null
}

/** Result of {@link InferenceService.tryDecision}. */
export interface DecisionTrial {
  provider: string
  model: string
  status: InferenceStatus
  reason: string | null
  selections: InferenceSelections | null
  usage: InferenceUsage | null
  latencyMs: number
}

@Injectable()
export class InferenceService {
  constructor(
    @InjectRepository(ExpenseInferenceEntity)
    private readonly inferences: Repository<ExpenseInferenceEntity>,
    @Inject(DECISION_PROVIDER) private readonly provider: DecisionProvider,
    @Inject(decisionConfig.KEY) private readonly config: DecisionConfig,
    private readonly choiceSets: ChoiceSetService,
    private readonly users: UsersService,
    private readonly metrics: DecisionMetricsService,
  ) {}

  /** Largest image accepted: the smaller of the configured and the provider limit. */
  get maxImageBytes(): number {
    return Math.min(this.config.maxImageBytes, this.provider.limits.maxImageBytes)
  }

  get maxChoices(): number {
    return this.provider.limits.maxChoices
  }

  get providerEnabled(): boolean {
    return this.provider.id !== 'disabled'
  }

  async infer(userId: string, request: InferenceRequest): Promise<InferenceResponseDto> {
    const existing = await this.inferences.findOneBy({
      userId,
      clientRequestId: request.clientRequestId,
    })
    if (existing) return toResponse(existing)

    const outcome = await this.decide(userId, request)
    const stored = await this.store(userId, request, outcome)
    // Only a newly stored result is a new provider request.
    if (stored.created)
      this.metrics.record({
        provider: this.provider.id,
        model: this.provider.model,
        status: outcome.status,
        reason: outcome.reason,
        called: outcome.called,
        latencyMs: outcome.latencyMs,
        imageBytes: request.image.byteLength,
        usage: outcome.usage,
      })
    return toResponse(stored.entity)
  }

  /**
   * Call the provider with a prepared choice set and validate its output, without storing anything.
   * Used by the admin playground; provider failures come back as `unavailable`, never as a throw.
   */
  async tryDecision(
    choiceSet: ChoiceSet,
    image: Uint8Array,
    locale: string,
    signal: AbortSignal,
  ): Promise<DecisionTrial> {
    const base = { provider: this.provider.id, model: this.provider.model }
    if (!this.providerEnabled)
      return {
        ...base,
        status: 'disabled',
        reason: 'provider_disabled',
        selections: null,
        usage: null,
        latencyMs: 0,
      }
    const startedAt = Date.now()
    const result = await this.callProvider(
      { image: { bytes: image, mimeType: 'image/jpeg' }, choices: choiceSet.choices, locale },
      this.config.timeoutMs,
      signal,
    )
    const latencyMs = Date.now() - startedAt
    const outcome: Pick<Outcome, 'status' | 'reason' | 'selections' | 'usage'> =
      'reason' in result
        ? { status: 'unavailable', reason: result.reason, selections: null, usage: null }
        : this.validate(choiceSet, result.output)
    this.metrics.record({
      ...base,
      origin: 'playground',
      status: outcome.status,
      reason: outcome.reason,
      called: true,
      latencyMs,
      imageBytes: image.byteLength,
      usage: outcome.usage,
    })
    return { ...base, ...outcome, latencyMs }
  }

  /** Remove inference records created before `cutoff`; returns the number removed. */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.inferences
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute()
    return result.affected ?? 0
  }

  private async decide(userId: string, request: InferenceRequest): Promise<Outcome> {
    const settings = await this.users.getSettings(userId)
    if (!settings.suggestionsEnabled) return skipped('disabled', 'suggestions_disabled')
    if (!this.providerEnabled) return skipped('disabled', 'provider_disabled')

    const budget = Math.min(request.deadlineMs ?? this.config.timeoutMs, this.config.timeoutMs)
    if (remaining(request, budget) < MIN_PROVIDER_BUDGET_MS)
      return skipped('unavailable', 'deadline')

    const placeKey = settings.suggestionLocationEnabled ? request.placeKey : null
    const choiceSet = await this.choiceSets.build(userId, placeKey, this.provider.limits.maxChoices)
    const left = remaining(request, budget)
    const snapshot = toInputSnapshot(choiceSet, request.locale)
    if (left < MIN_PROVIDER_BUDGET_MS)
      return skipped('unavailable', 'deadline', choiceSet.version, snapshot)
    if (request.signal.aborted)
      return skipped('unavailable', 'cancelled', choiceSet.version, snapshot)

    const input: DecisionInput = {
      image: { bytes: request.image, mimeType: 'image/jpeg' },
      choices: choiceSet.choices,
      locale: request.locale,
    }
    const startedAt = Date.now()
    const result = await this.callProvider(input, left, request.signal)
    const latencyMs = Date.now() - startedAt
    const base = { choiceSetVersion: choiceSet.version, latencyMs, called: true, input: snapshot }
    if ('reason' in result)
      return {
        ...base,
        status: 'unavailable',
        reason: result.reason,
        selections: null,
        usage: null,
        output: null,
      }
    return { ...base, ...this.validate(choiceSet, result.output) }
  }

  private validate(
    choiceSet: ChoiceSet,
    output: DecisionOutput,
  ): Pick<Outcome, 'status' | 'reason' | 'selections' | 'usage' | 'output'> {
    const usage = output.usage ?? null
    try {
      assertDecisionRefs(choiceSet.choices, output)
      const mapped = mapDecisionOutput(choiceSet, output)
      return {
        status: 'succeeded',
        reason: null,
        selections: mapped,
        usage,
        output: toOutputSnapshot(output),
      }
    } catch {
      return {
        status: 'unavailable',
        reason: 'invalid_output',
        selections: null,
        usage,
        output: null,
      }
    }
  }

  /**
   * Call the provider with a hard deadline. The provider gets an `AbortSignal` that fires on the
   * deadline or when the client disconnects; the race guarantees the deadline even when an
   * adapter ignores the signal. Never throws.
   */
  private async callProvider(
    input: DecisionInput,
    budgetMs: number,
    clientSignal: AbortSignal,
  ): Promise<{ output: DecisionOutput } | { reason: string }> {
    const controller = new AbortController()
    let abortReason: 'timeout' | 'cancelled' | null = null
    const abort = (reason: 'timeout' | 'cancelled') => {
      abortReason ??= reason
      controller.abort()
    }
    const timer = setTimeout(() => abort('timeout'), budgetMs)
    const onClientAbort = () => abort('cancelled')
    clientSignal.addEventListener('abort', onClientAbort, { once: true })
    if (clientSignal.aborted) onClientAbort()
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => reject(new DecisionProviderError('timeout', 'Decision deadline reached')),
        { once: true },
      )
    })
    try {
      const output = await Promise.race([this.provider.decide(input, controller.signal), aborted])
      return { output }
    } catch (error: unknown) {
      if (abortReason) return { reason: abortReason }
      if (error instanceof DecisionProviderError)
        return { reason: error.reason === 'disabled' ? 'provider_disabled' : error.reason }
      return { reason: 'provider_error' }
    } finally {
      clearTimeout(timer)
      clientSignal.removeEventListener('abort', onClientAbort)
    }
  }

  /** Insert once per `(user, clientRequestId)`; a concurrent duplicate keeps the first result. */
  private async store(
    userId: string,
    request: InferenceRequest,
    outcome: Outcome,
  ): Promise<{ entity: ExpenseInferenceEntity; created: boolean }> {
    const result = await this.inferences
      .createQueryBuilder()
      .insert()
      .values({
        userId,
        clientRequestId: request.clientRequestId,
        provider: this.provider.id,
        model: this.provider.model,
        status: outcome.status,
        reason: outcome.reason,
        choiceSetVersion: outcome.choiceSetVersion,
        selections: outcome.selections,
        imageBytes: request.image.byteLength,
        latencyMs: outcome.latencyMs,
        providerCalled: outcome.called,
        usage: outcome.usage,
        input: outcome.input,
        output: outcome.output,
      })
      .orIgnore()
      .execute()
    const entity = await this.inferences.findOneByOrFail({
      userId,
      clientRequestId: request.clientRequestId,
    })
    // RETURNING yields no row when the insert was ignored.
    const raw: unknown = result.raw
    return { entity, created: Array.isArray(raw) && raw.length > 0 }
  }
}

function remaining(request: InferenceRequest, budgetMs: number): number {
  return budgetMs - (Date.now() - request.receivedAt)
}

function skipped(
  status: InferenceStatus,
  reason: string,
  choiceSetVersion = '',
  input: InferenceInput | null = null,
): Outcome {
  return {
    status,
    reason,
    choiceSetVersion,
    selections: null,
    usage: null,
    latencyMs: 0,
    called: false,
    input,
    output: null,
  }
}

export function toResponse(entity: ExpenseInferenceEntity): InferenceResponseDto {
  const response: InferenceResponseDto = {
    id: entity.id,
    status: entity.status,
    choiceSetVersion: entity.choiceSetVersion,
    imageType: entity.selections?.imageType ?? null,
    category: entity.selections?.category ?? null,
    personalChoice: entity.selections?.personalChoice ?? null,
    provider: entity.provider,
    model: entity.model,
    latencyMs: entity.latencyMs,
  }
  if (entity.reason) response.reason = entity.reason
  return response
}
