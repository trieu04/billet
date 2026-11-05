import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CategoryService, type SystemCategory } from '../../category/service'
import { DAY_MS, INFERENCE_RETENTION_DAYS } from '../constants'
import type {
  AdminInferenceDto,
  AdminInferenceInputDto,
  AdminInferenceOutputDto,
  AdminInferencePageDto,
  AdminInferenceQueryDto,
  AdminSummaryDto,
  AdminSummaryQueryDto,
  AdminUsageTotalsDto,
} from '../dtos/admin.dto'
import { ExpenseInferenceEntity } from '../entities/expense-inference.entity'
import { ChoiceSetService } from './choice-set.service'

const DEFAULT_SUMMARY_DAYS = 7

interface UsageRow {
  input_tokens: string
  output_tokens: string
  cost: string
}

const USAGE_COLUMNS = `
  coalesce(sum((usage->>'inputTokens')::numeric), 0)::text AS input_tokens,
  coalesce(sum((usage->>'outputTokens')::numeric), 0)::text AS output_tokens,
  coalesce(sum((usage->>'costMicroUsd')::numeric), 0)::text AS cost`

/**
 * Read-only view of inference records for operators. Every response goes through {@link toDto},
 * which keeps `userId` as the only reference to the person and drops personal choice and user
 * category ids.
 */
@Injectable()
export class InferenceAdminService {
  constructor(
    @InjectRepository(ExpenseInferenceEntity)
    private readonly inferences: Repository<ExpenseInferenceEntity>,
    private readonly categories: CategoryService,
    private readonly choiceSets: ChoiceSetService,
  ) {}

  /** Summary period: defaults to the last 7 days; validated against the retention window. */
  resolveRange(query: { from?: string; to?: string }, now = new Date()): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : now
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_SUMMARY_DAYS * DAY_MS)
    if (from.getTime() > to.getTime()) throw new BadRequestException('from must not be after to')
    if (to.getTime() - from.getTime() > INFERENCE_RETENTION_DAYS * DAY_MS)
      throw new BadRequestException(`The range cannot exceed ${INFERENCE_RETENTION_DAYS} days`)
    return { from, to }
  }

  /** Everything except linked expense outcomes, which the `expense` module owns. */
  async summary(
    query: AdminSummaryQueryDto,
    range: { from: Date; to: Date },
  ): Promise<Omit<AdminSummaryDto, 'fieldOutcomes'>> {
    const timezone = query.timezone ?? 'UTC'
    await this.assertTimezone(timezone)
    const params: unknown[] = [range.from, range.to]
    let where = 'created_at >= $1 AND created_at < $2'
    if (query.provider) {
      params.push(query.provider)
      where += ` AND provider = $${params.length}`
    }
    if (query.model) {
      params.push(query.model)
      where += ` AND model = $${params.length}`
    }
    const select = <T extends object>(sql: string, extra: unknown[] = []) =>
      this.inferences.query(sql, [...params, ...extra]) as Promise<T[]>
    const [overall, statuses, reasons, imageTypes, providers, daily] = await Promise.all([
      select<
        UsageRow & {
          total: number
          provider_calls: number
          p50: number | null
          p95: number | null
        }
      >(
        `SELECT count(*)::int AS total,
           count(*) FILTER (WHERE provider_called)::int AS provider_calls,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE provider_called) AS p50,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE provider_called) AS p95,
           ${USAGE_COLUMNS}
         FROM expense_inferences WHERE ${where}`,
      ),
      select<{ key: string; count: number }>(
        `SELECT status AS key, count(*)::int AS count FROM expense_inferences
         WHERE ${where} GROUP BY 1 ORDER BY 2 DESC, 1`,
      ),
      select<{ key: string; count: number }>(
        `SELECT reason AS key, count(*)::int AS count FROM expense_inferences
         WHERE ${where} AND reason IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1`,
      ),
      select<{ key: string; count: number }>(
        `SELECT selections->'imageType'->>'id' AS key, count(*)::int AS count
         FROM expense_inferences
         WHERE ${where} AND selections->'imageType'->>'id' IS NOT NULL
         GROUP BY 1 ORDER BY 2 DESC, 1`,
      ),
      select<
        UsageRow & {
          provider: string
          model: string
          total: number
          provider_calls: number
          unavailable: number
        }
      >(
        `SELECT provider, model, count(*)::int AS total,
           count(*) FILTER (WHERE provider_called)::int AS provider_calls,
           count(*) FILTER (WHERE status = 'unavailable')::int AS unavailable,
           ${USAGE_COLUMNS}
         FROM expense_inferences WHERE ${where} GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2`,
      ),
      select<{
        day: string
        total: number
        succeeded: number
        unavailable: number
        disabled: number
        cost: string
      }>(
        `SELECT to_char(created_at AT TIME ZONE $${params.length + 1}, 'YYYY-MM-DD') AS day,
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'succeeded')::int AS succeeded,
           count(*) FILTER (WHERE status = 'unavailable')::int AS unavailable,
           count(*) FILTER (WHERE status = 'disabled')::int AS disabled,
           coalesce(sum((usage->>'costMicroUsd')::numeric), 0)::text AS cost
         FROM expense_inferences WHERE ${where} GROUP BY 1 ORDER BY 1`,
        [timezone],
      ),
    ])
    const totals = overall[0]
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      timezone,
      total: totals.total,
      byStatus: statuses,
      byReason: reasons,
      byImageType: imageTypes,
      providerCalls: totals.provider_calls,
      latencyP50Ms: totals.p50 === null ? null : Number(totals.p50),
      latencyP95Ms: totals.p95 === null ? null : Number(totals.p95),
      usage: usageTotals(totals),
      daily: daily.map((row) => ({
        day: row.day,
        total: row.total,
        succeeded: row.succeeded,
        unavailable: row.unavailable,
        disabled: row.disabled,
        costMicroUsd: Number(row.cost),
      })),
      byProvider: providers.map((row) => ({
        provider: row.provider,
        model: row.model,
        total: row.total,
        providerCalls: row.provider_calls,
        unavailable: row.unavailable,
        ...usageTotals(row),
      })),
    }
  }

  async list(query: AdminInferenceQueryDto): Promise<AdminInferencePageDto> {
    const range = {
      from: query.from ? new Date(query.from) : null,
      to: query.to ? new Date(query.to) : null,
    }
    if (range.from && range.to && range.from.getTime() > range.to.getTime())
      throw new BadRequestException('from must not be after to')
    const qb = this.inferences
      .createQueryBuilder('i')
      .orderBy('i.id', 'DESC')
      .take(query.limit + 1)
    if (range.from) qb.andWhere('i.createdAt >= :from', { from: range.from })
    if (range.to) qb.andWhere('i.createdAt < :to', { to: range.to })
    if (query.status) qb.andWhere('i.status = :status', { status: query.status })
    if (query.reason) qb.andWhere('i.reason = :reason', { reason: query.reason })
    if (query.provider) qb.andWhere('i.provider = :provider', { provider: query.provider })
    if (query.model) qb.andWhere('i.model = :model', { model: query.model })
    if (query.userId) qb.andWhere('i.userId = :userId', { userId: query.userId })
    if (query.imageType)
      qb.andWhere(`i.selections->'imageType'->>'id' = :imageType`, { imageType: query.imageType })
    if (query.cursor) qb.andWhere('i.id < :cursor', { cursor: query.cursor })
    const rows = await qb.getMany()
    const hasMore = rows.length > query.limit
    if (hasMore) rows.pop()
    const labels = await this.labels()
    return {
      data: rows.map((row) => toDto(row, labels)),
      nextCursor: hasMore ? (rows.at(-1)?.id ?? null) : null,
      hasMore,
    }
  }

  async get(id: string): Promise<{
    inference: AdminInferenceDto
    input: AdminInferenceInputDto | null
    output: AdminInferenceOutputDto | null
    usage: ExpenseInferenceEntity['usage']
    imageBytes: number
    choiceSetVersion: string
  }> {
    const row = await this.inferences.findOneBy({ id })
    if (!row) throw new NotFoundException('Inference not found')
    return {
      inference: toDto(row, await this.labels()),
      input: toInputDto(row),
      output: toOutputDto(row),
      usage: row.usage,
      imageBytes: row.imageBytes,
      choiceSetVersion: row.choiceSetVersion,
    }
  }

  private async labels(): Promise<Labels> {
    const [imageTypes, categories] = await Promise.all([
      this.choiceSets.loadImageTypes(),
      this.categories.listSystemCategories(),
    ])
    return {
      imageTypes: new Map(imageTypes.map((type) => [type.key, type.label])),
      categories: new Map(categories.map((category) => [category.id, category])),
    }
  }

  private async assertTimezone(timezone: string): Promise<void> {
    const known = await this.inferences.query<unknown[]>(
      'SELECT 1 FROM pg_timezone_names WHERE name = $1 LIMIT 1',
      [timezone],
    )
    if (known.length === 0) throw new BadRequestException('Unknown timezone')
  }
}

interface Labels {
  imageTypes: ReadonlyMap<string, string>
  categories: ReadonlyMap<string, SystemCategory>
}

function usageTotals(row: UsageRow): AdminUsageTotalsDto {
  return {
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    costMicroUsd: Number(row.cost),
  }
}

/** The offered choices with the provider's pick marked. */
export function toInputDto(row: ExpenseInferenceEntity): AdminInferenceInputDto | null {
  const { input, output } = row
  if (!input) return null
  const mark = (choices: typeof input.imageTypes, picked: string | undefined) =>
    choices.map(({ ref, label, description }) => ({
      ref,
      label,
      ...(description ? { description } : {}),
      selected: ref === picked,
    }))
  return {
    locale: input.locale,
    imageTypes: mark(input.imageTypes, output?.imageType.ref),
    categories: mark(input.categories, output?.category?.ref),
    personal: mark(input.personal, output?.personal?.ref),
  }
}

/** The provider's answer with each ref resolved to the label it stood for. */
export function toOutputDto(row: ExpenseInferenceEntity): AdminInferenceOutputDto | null {
  const { input, output } = row
  if (!output) return null
  const resolve = (
    choices: NonNullable<typeof input>['imageTypes'] | undefined,
    selection: { ref: string; confidence: number },
  ) => ({
    ref: selection.ref,
    label: choices?.find((choice) => choice.ref === selection.ref)?.label ?? null,
    confidence: selection.confidence,
  })
  return {
    imageType: resolve(input?.imageTypes, output.imageType),
    category: output.category ? resolve(input?.categories, output.category) : null,
    personal: output.personal ? resolve(input?.personal, output.personal) : null,
  }
}

export function toDto(row: ExpenseInferenceEntity, labels: Labels): AdminInferenceDto {
  const imageType = row.selections?.imageType ?? null
  const category = row.selections?.category ?? null
  const personal = row.selections?.personalChoice ?? null
  const system = category ? labels.categories.get(category.id) : undefined
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    provider: row.provider,
    model: row.model,
    status: row.status,
    reason: row.reason,
    latencyMs: row.latencyMs,
    providerCalled: row.providerCalled,
    imageType: imageType
      ? {
          key: imageType.id,
          label: labels.imageTypes.get(imageType.id) ?? null,
          confidence: imageType.confidence,
        }
      : null,
    category: category
      ? system
        ? {
            kind: 'system',
            code: system.code,
            name: system.name,
            confidence: category.confidence,
          }
        : { kind: 'user', confidence: category.confidence }
      : null,
    personalChoice: personal ? { selected: true, confidence: personal.confidence } : null,
  }
}
