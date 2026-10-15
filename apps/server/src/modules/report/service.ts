import { BadRequestException, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { ReportQueryDto } from './dto'
@Injectable()
export class ReportService {
  constructor(private readonly db: DataSource) {}
  async get(userId: string, q: ReportQueryDto) {
    validateTimezone(q.timezone)
    const from = new Date(q.from),
      to = new Date(q.to)
    if (!(from < to) || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException('Report range must be positive and no longer than 366 days')
    const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()))
    const [summary, previous, categories, series, topDay] = await Promise.all([
      this.summary(userId, q.currency, from, to),
      this.summary(userId, q.currency, previousFrom, from),
      this.db.query<{ id: string; code: string; name: string; total: string; count: string }[]>(
        `SELECT c.id::text,c.code,c.name,sum(e.amount_minor)::text total,count(*)::text count FROM expenses e JOIN categories c ON c.id=e.category_id WHERE e.user_id=$1 AND e.currency=$2 AND e.deleted_at IS NULL AND e.occurred_at >= $3 AND e.occurred_at < $4 GROUP BY c.id,c.code,c.name ORDER BY sum(e.amount_minor) DESC`,
        [userId, q.currency, from, to],
      ),
      this.db.query<{ bucket: string; total: string; count: string }[]>(
        `SELECT to_char(date_trunc($5, occurred_at AT TIME ZONE $6), CASE WHEN $5='day' THEN 'YYYY-MM-DD' ELSE 'YYYY-MM' END) bucket,sum(amount_minor)::text total,count(*)::text count FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at >= $3 AND occurred_at < $4 GROUP BY 1 ORDER BY 1`,
        [userId, q.currency, from, to, q.granularity, q.timezone],
      ),
      this.db.query<{ day: string; total: string }[]>(
        `SELECT to_char(occurred_at AT TIME ZONE $5,'YYYY-MM-DD') AS "day",sum(amount_minor)::text AS total FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at >= $3 AND occurred_at < $4 GROUP BY 1 ORDER BY sum(amount_minor) DESC LIMIT 1`,
        [userId, q.currency, from, to, q.timezone],
      ),
    ])
    const currentTotal = BigInt(summary.totalMinor),
      previousTotal = BigInt(previous.totalMinor)
    return {
      range: { from: from.toISOString(), to: to.toISOString(), timezone: q.timezone },
      currency: q.currency,
      totalMinor: summary.totalMinor,
      count: summary.count,
      comparison: {
        from: previousFrom.toISOString(),
        to: from.toISOString(),
        totalMinor: previous.totalMinor,
        count: previous.count,
        changePercent:
          previousTotal === 0n
            ? null
            : Number(((currentTotal - previousTotal) * 10000n) / previousTotal) / 100,
      },
      series: series.map((x) => ({
        bucket: x.bucket,
        totalMinor: x.total,
        count: Number(x.count),
      })),
      categories: categories.map((x) => ({
        categoryId: x.id,
        code: x.code,
        name: x.name,
        totalMinor: x.total,
        count: Number(x.count),
        sharePercent:
          currentTotal === 0n ? null : Number((BigInt(x.total) * 10000n) / currentTotal) / 100,
      })),
      insights: topDay[0]
        ? [{ type: 'highest_spend_day', date: topDay[0].day, amountMinor: topDay[0].total }]
        : [],
    }
  }
  private async summary(userId: string, currency: string, from: Date, to: Date) {
    const rows = await this.db.query<{ total: string; count: string }[]>(
      `SELECT coalesce(sum(amount_minor),0)::text total,count(*)::text count FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at >= $3 AND occurred_at < $4`,
      [userId, currency, from, to],
    )
    return { totalMinor: rows[0]?.total ?? '0', count: Number(rows[0]?.count ?? 0) }
  }
}
function validateTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
  } catch {
    throw new BadRequestException('Unknown timezone')
  }
}
