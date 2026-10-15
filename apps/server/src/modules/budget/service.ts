import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { MonthlyBudgetEntity } from './entities/monthly-budget.entity'
@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(MonthlyBudgetEntity)
    private readonly budgets: Repository<MonthlyBudgetEntity>,
    private readonly db: DataSource,
  ) {}
  async set(userId: string, month: string, currency: string, limitMinor: string) {
    const date = `${month}-01`
    let row = await this.budgets.findOneBy({ userId, month: date, currency })
    row ??= this.budgets.create({ userId, month: date, currency })
    row.limitMinor = limitMinor
    await this.budgets.save(row)
    return this.get(userId, month, currency)
  }
  async get(userId: string, month: string, currency: string) {
    const row = await this.budgets.findOneBy({ userId, month: `${month}-01`, currency })
    const result = await this.db.query<{ spent: string }[]>(
      `SELECT coalesce(sum(amount_minor),0)::text spent FROM expenses WHERE user_id=$1 AND currency=$2 AND deleted_at IS NULL AND occurred_at >= $3::date AND occurred_at < $3::date + interval '1 month'`,
      [userId, currency, `${month}-01`],
    )
    const spent = result[0]?.spent ?? '0'
    return {
      month,
      currency,
      isSet: Boolean(row),
      limitMinor: row?.limitMinor ?? null,
      spentMinor: spent,
      remainingMinor: row ? (BigInt(row.limitMinor) - BigInt(spent)).toString() : null,
    }
  }
}
