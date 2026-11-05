import { CalendarClock, ChartColumn, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from '@/components/button'
import { EmptyState, ErrorState, PageHeader, Card, Segmented, Skeleton } from '@/components/ui'
import { formatDayHeading, monthKey, useToday } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useBudget, useCategoryIndex, useProfile } from '@/lib/queries'
import { fillSeries, PERIODS, periodFor, type PeriodId, type Report, useReport } from './api'
import { BarChart } from './bar-chart'
import { BudgetCard } from './budget-card'

export function StatsPage() {
  const [periodId, setPeriodId] = useState<PeriodId>('30d')
  const profile = useProfile()
  const currency = profile.data?.settings.defaultCurrency
  const report = useReport(periodId, currency)
  const month = monthKey(useToday())
  const budget = useBudget(month, currency)
  const period = useMemo(() => periodFor(periodId), [periodId])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Thống kê"
        title="Bạn đang chi tiêu thế nào?"
        description={currency ? `Tổng hợp từ các khoản chi bằng ${currency}.` : undefined}
        actions={
          <Segmented<PeriodId>
            label="Khoảng thời gian"
            value={periodId}
            onChange={setPeriodId}
            options={PERIODS.map((item) => ({
              value: item.value,
              text: item.label,
              label: item.label,
            }))}
          />
        }
      />

      {report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : report.isPending || !currency ? (
        <div className="space-y-4" aria-busy>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : report.data.count === 0 ? (
        <EmptyState
          icon={<ChartColumn className="size-6" aria-hidden />}
          title="Chưa có dữ liệu để thống kê"
          action={
            <Link to="/journal/new" className={buttonClass('accent', 'md')}>
              <Plus className="size-4" aria-hidden /> Thêm chi tiêu
            </Link>
          }
        >
          Hãy ghi một vài khoản chi trong khoảng này, thống kê sẽ tự xuất hiện.
        </EmptyState>
      ) : (
        <ReportView report={report.data} period={period} periodId={periodId} />
      )}

      {currency ? (
        <BudgetCard
          month={month}
          currency={currency}
          budget={budget.data}
          loading={budget.isPending}
        />
      ) : null}
    </div>
  )
}

function ReportView({
  report,
  period,
  periodId,
}: {
  report: Report
  period: ReturnType<typeof periodFor>
  periodId: PeriodId
}) {
  const { index: categories } = useCategoryIndex()
  const points = useMemo(() => fillSeries(period, report.series), [period, report.series])
  const { changePercent } = report.comparison
  const average = Number(report.totalMinor) / Math.max(1, period.days)
  const topDay = report.insights.find((insight) => insight.type === 'highest_spend_day')
  const periodLabel = PERIODS.find((item) => item.value === periodId)?.label.toLowerCase()

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tổng chi" value={formatMoney(report.totalMinor, report.currency)} strong />
        <Stat label="Số khoản chi" value={String(report.count)} />
        <Stat
          label="Trung bình mỗi ngày"
          value={formatMoney(String(Math.round(average)), report.currency)}
        />
        <Stat
          label="So với kỳ trước"
          value={
            changePercent === null
              ? '–'
              : `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('vi-VN')}%`
          }
          icon={
            changePercent === null ? null : changePercent > 0 ? (
              <TrendingUp className="size-4 text-coral-strong" aria-hidden />
            ) : (
              <TrendingDown className="size-4 text-sage" aria-hidden />
            )
          }
          hint={
            changePercent === null
              ? 'Chưa có kỳ trước để so sánh'
              : `Kỳ trước: ${formatMoney(report.comparison.totalMinor, report.currency)}`
          }
        />
      </dl>

      <Card className="p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-black tracking-tight">
            Chi tiêu theo {period.granularity === 'month' ? 'tháng' : 'ngày'}
          </h2>
          {topDay ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <CalendarClock className="size-4" aria-hidden />
              Nhiều nhất:{' '}
              <span className="font-bold text-ink">
                {formatDayHeading(topDay.date).split(' · ').at(-1)}
              </span>{' '}
              ({formatMoney(topDay.amountMinor, report.currency)})
            </p>
          ) : null}
        </div>
        <BarChart points={points} currency={report.currency} caption={`Chi tiêu ${periodLabel}`} />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight">Chi cho những gì</h2>
        <div
          role="img"
          aria-label="Tỷ trọng chi tiêu theo danh mục"
          className="mt-4 flex h-3 overflow-hidden rounded-full bg-sunken"
        >
          {report.categories.map((item) => (
            <span
              key={item.categoryId}
              style={{
                width: `${item.sharePercent ?? 0}%`,
                backgroundColor: categories.get(item.categoryId)?.color ?? '#cfc3b6',
              }}
            />
          ))}
        </div>
        <ul className="mt-5 divide-y divide-line/70">
          {report.categories.map((item) => {
            const category = categories.get(item.categoryId)
            return (
              <li key={item.categoryId} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? '#cfc3b6' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-sm text-muted">{item.count} khoản chi</p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">
                    {formatMoney(item.totalMinor, report.currency)}
                  </p>
                  <p className="text-sm text-muted tabular-nums">
                    {item.sharePercent === null
                      ? '–'
                      : `${item.sharePercent.toLocaleString('vi-VN')}%`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}

function Stat({
  label,
  value,
  hint,
  icon,
  strong = false,
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${
        strong ? 'border-ink bg-ink text-white' : 'border-line bg-surface'
      }`}
    >
      <dt className={`text-sm ${strong ? 'text-white/70' : 'text-muted'}`}>{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-xl font-black tracking-tight tabular-nums sm:text-2xl">
        {icon}
        {value}
      </dd>
      {hint ? <dd className="mt-1 text-xs text-muted">{hint}</dd> : null}
    </div>
  )
}
