import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'node:crypto'
import { DataSource, Repository } from 'typeorm'
import { CategoryService } from '../category/service'
import { MediaService } from '../media/service'
import { RealtimeService } from '../realtime/services/realtime.service'
import { RecognitionService } from '../recognition/service'
import type { CreateExpenseDto, ExpenseQueryDto, ExpenseResponseDto, UpdateExpenseDto } from './dto'
import { ExpenseEntity, ExpenseSource } from './entities/expense.entity'
import { buildCalendarHistory, type CalendarAggregateRow } from './calendar'

interface Cursor {
  occurredAt: string
  id: string
}
@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(ExpenseEntity) private readonly expenses: Repository<ExpenseEntity>,
    private readonly categories: CategoryService,
    private readonly media: MediaService,
    private readonly realtime: RealtimeService,
    private readonly recognition: RecognitionService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, input: CreateExpenseDto): Promise<ExpenseResponseDto> {
    this.validateInput(input)
    const hash = requestHash(input)
    const existing = await this.expenses
      .createQueryBuilder('e')
      .withDeleted()
      .where('e.userId = :userId AND e.idempotencyKey = :key', {
        userId,
        key: input.idempotencyKey,
      })
      .getOne()
    if (existing) {
      if (existing.requestHash !== hash)
        throw new ConflictException('Idempotency key was already used with different content')
      return this.toResponse(existing)
    }
    const category = await this.categories.resolve(input.categoryId)
    if (input.mediaAssetId) await this.media.assertReady(userId, input.mediaAssetId)
    if (input.recognitionJobId)
      await this.recognition.assertAccepted(userId, input.recognitionJobId, input.mediaAssetId)
    const entity = this.expenses.create({
      ...input,
      userId,
      categoryId: category.id,
      mediaAssetId: input.mediaAssetId ?? null,
      recognitionJobId: input.recognitionJobId ?? null,
      caption: clean(input.caption),
      merchant: clean(input.merchant),
      location: clean(input.location),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      source: input.recognitionJobId ? ExpenseSource.Recognition : ExpenseSource.Manual,
      fieldSources: input.fieldSources ?? {},
      requestHash: hash,
      occurredAt: new Date(input.occurredAt),
    })
    let saved: ExpenseEntity
    try {
      saved = await this.expenses.save(entity)
    } catch (error: unknown) {
      if (isUnique(error)) throw new ConflictException('Idempotency key is already in use')
      throw error
    }
    await this.changed(userId, saved.id)
    return this.toResponse(saved)
  }

  async find(userId: string, id: string): Promise<ExpenseResponseDto> {
    return this.toResponse(await this.findOwned(userId, id))
  }

  async list(userId: string, query: ExpenseQueryDto) {
    const qb = this.expenses
      .createQueryBuilder('e')
      .where('e.userId = :userId', { userId })
      .orderBy('e.occurredAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .take(query.limit + 1)
    if (query.from) qb.andWhere('e.occurredAt >= :from', { from: query.from })
    if (query.to) qb.andWhere('e.occurredAt < :to', { to: query.to })
    if (query.currency) qb.andWhere('e.currency = :currency', { currency: query.currency })
    const cursor = decodeCursor(query.cursor)
    if (cursor)
      qb.andWhere('(e.occurredAt, e.id) < (:cursorTime, :cursorId)', {
        cursorTime: cursor.occurredAt,
        cursorId: cursor.id,
      })
    const rows = await qb.getMany()
    const hasMore = rows.length > query.limit
    if (hasMore) rows.pop()
    const last = rows.at(-1)
    const totals = await this.aggregate(userId, query.from, query.to, query.currency)
    return {
      data: rows.map((row) => this.toResponse(row)),
      nextCursor:
        hasMore && last
          ? encodeCursor({ occurredAt: last.occurredAt.toISOString(), id: last.id })
          : null,
      totals,
    }
  }

  async update(userId: string, id: string, input: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    const expense = await this.findOwned(userId, id)
    if (expense.version !== input.version)
      throw new ConflictException('Expense was changed; reload before editing')
    this.validateInput(input)
    if (input.categoryId) expense.categoryId = (await this.categories.resolve(input.categoryId)).id
    if (input.mediaAssetId && input.mediaAssetId !== expense.mediaAssetId)
      await this.media.assertReady(userId, input.mediaAssetId)
    const mutable = [
      'amountMinor',
      'currency',
      'occurredTimezone',
      'mediaAssetId',
      'recognitionJobId',
      'latitude',
      'longitude',
      'fieldSources',
    ] as const
    for (const key of mutable)
      if (input[key] !== undefined) Object.assign(expense, { [key]: input[key] })
    if (input.occurredAt) expense.occurredAt = new Date(input.occurredAt)
    for (const key of ['caption', 'merchant', 'location'] as const)
      if (key in input) expense[key] = clean(input[key])
    if (input.recognitionJobId)
      await this.recognition.assertAccepted(
        userId,
        input.recognitionJobId,
        input.mediaAssetId ?? expense.mediaAssetId ?? undefined,
      )
    const result = await this.expenses
      .createQueryBuilder()
      .update()
      .set({
        categoryId: expense.categoryId,
        mediaAssetId: expense.mediaAssetId,
        recognitionJobId: expense.recognitionJobId,
        amountMinor: expense.amountMinor,
        currency: expense.currency,
        occurredAt: expense.occurredAt,
        occurredTimezone: expense.occurredTimezone,
        caption: expense.caption,
        merchant: expense.merchant,
        location: expense.location,
        latitude: expense.latitude,
        longitude: expense.longitude,
        fieldSources: expense.fieldSources,
        version: () => '"version" + 1',
      })
      .where('id = :id AND user_id = :userId AND version = :version', {
        id,
        userId,
        version: input.version,
      })
      .execute()
    if (!result.affected) throw new ConflictException('Expense was changed; reload before editing')
    const saved = await this.findOwned(userId, id)
    await this.changed(userId, id)
    return this.toResponse(saved)
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.expenses.softDelete({ id, userId })
    if (result.affected) await this.changed(userId, id)
  }

  async calendar(userId: string, month: string, currency: string, timezone: string) {
    validateTimezone(timezone)
    const rows = await this.dataSource.query<
      {
        day: string
        total: string
        count: string
        thumbnail_id: string | null
        media_ids: string[] | null
      }[]
    >(
      `SELECT to_char(occurred_at AT TIME ZONE $4, 'YYYY-MM-DD') AS "day", sum(amount_minor)::text AS total, count(*)::text AS count, min(media_asset_id)::text AS thumbnail_id, (array_agg(media_asset_id::text ORDER BY occurred_at DESC, id DESC) FILTER (WHERE media_asset_id IS NOT NULL))[1:3] AS media_ids FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at >= ($3::date AT TIME ZONE $4) AND occurred_at < (($3::date + interval '1 month') AT TIME ZONE $4) GROUP BY 1 ORDER BY 1`,
      [userId, currency, `${month}-01`, timezone],
    )
    return {
      month,
      currency,
      totalMinor: rows.reduce((sum, row) => sum + BigInt(row.total), 0n).toString(),
      count: rows.reduce((sum, row) => sum + Number(row.count), 0),
      days: rows.map((row) => ({
        date: row.day,
        totalMinor: row.total,
        count: Number(row.count),
        representativeMediaId: row.thumbnail_id,
        mediaAssetIds: row.media_ids ?? [],
      })),
    }
  }

  async calendarHistory(userId: string, throughMonth: string, currency: string, timezone: string) {
    validateTimezone(timezone)
    const rows = await this.dataSource.query<CalendarAggregateRow[]>(
      `SELECT to_char(occurred_at AT TIME ZONE $4, 'YYYY-MM') AS month, to_char(occurred_at AT TIME ZONE $4, 'YYYY-MM-DD') AS day, sum(amount_minor)::text AS total, count(*)::text AS count, min(media_asset_id)::text AS thumbnail_id, (array_agg(media_asset_id::text ORDER BY occurred_at DESC, id DESC) FILTER (WHERE media_asset_id IS NOT NULL))[1:3] AS media_ids FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at < (($3::date + interval '1 month') AT TIME ZONE $4) GROUP BY 1, 2 ORDER BY 1, 2`,
      [userId, currency, `${throughMonth}-01`, timezone],
    )
    return { months: buildCalendarHistory(rows, throughMonth, currency) }
  }

  async aggregate(userId: string, from?: string, to?: string, currency?: string) {
    const params: unknown[] = [userId]
    let sql =
      'SELECT currency, sum(amount_minor)::text total, count(*)::text count FROM expenses WHERE user_id=$1 AND deleted_at IS NULL'
    if (from) {
      params.push(from)
      sql += ` AND occurred_at >= $${params.length}`
    }
    if (to) {
      params.push(to)
      sql += ` AND occurred_at < $${params.length}`
    }
    if (currency) {
      params.push(currency)
      sql += ` AND currency = $${params.length}`
    }
    sql += ' GROUP BY currency ORDER BY currency'
    const rows = await this.dataSource.query<{ currency: string; total: string; count: string }[]>(
      sql,
      params,
    )
    return rows.map((row) => ({
      currency: row.currency,
      totalMinor: row.total,
      count: Number(row.count),
    }))
  }
  private async findOwned(userId: string, id: string) {
    const row = await this.expenses.findOneBy({ id, userId })
    if (!row) throw new NotFoundException('Expense not found')
    return row
  }
  private validateInput(input: Partial<CreateExpenseDto>) {
    if (input.occurredTimezone) validateTimezone(input.occurredTimezone)
    if ((input.latitude === undefined) !== (input.longitude === undefined))
      throw new ConflictException('Latitude and longitude must be provided together')
  }
  private async changed(userId: string, id: string) {
    await this.realtime.publish(userId, 'expense.changed', { expenseId: id })
  }
  private toResponse(e: ExpenseEntity): ExpenseResponseDto {
    return {
      id: e.id,
      amountMinor: e.amountMinor,
      currency: e.currency,
      occurredAt: e.occurredAt.toISOString(),
      occurredTimezone: e.occurredTimezone,
      categoryId: e.categoryId,
      mediaAssetId: e.mediaAssetId,
      recognitionJobId: e.recognitionJobId,
      caption: e.caption,
      merchant: e.merchant,
      location: e.location,
      version: e.version,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }
  }
}
function clean(value: string | undefined | null): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}
function requestHash(input: CreateExpenseDto) {
  return createHash('sha256')
    .update(JSON.stringify(input, Object.keys(input).sort()))
    .digest('hex')
}
function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
function validateTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
  } catch {
    throw new ConflictException('Unknown timezone')
  }
}
function encodeCursor(value: Cursor) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}
function decodeCursor(value?: string): Cursor | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString())
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'occurredAt' in parsed &&
      'id' in parsed &&
      typeof parsed.occurredAt === 'string' &&
      typeof parsed.id === 'string'
    )
      return parsed as Cursor
  } catch {}
  throw new ConflictException('Invalid cursor')
}
