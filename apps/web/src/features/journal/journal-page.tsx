import { BookHeart, CalendarDays, ChevronLeft, ChevronRight, List, Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, buttonClass } from '@/components/button'
import { MediaThumb } from '@/components/media-thumb'
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  Segmented,
  Skeleton,
} from '@/components/ui'
import {
  addDays,
  dayKey,
  formatDayHeading,
  formatMonthTitle,
  monthKey,
  monthRange,
  shiftMonth,
  useToday,
} from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useBudget, useCategoryIndex, useProfile } from '@/lib/queries'
import { type Expense, useCalendarMonth, useExpenseList } from './api'
import { CalendarView } from './calendar-view'
import { ExpenseRow } from './expense-row'

type View = 'list' | 'calendar'
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DAY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function dayRange(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  const start = new Date(year, month - 1, date)
  return { from: start.toISOString(), to: addDays(start, 1).toISOString() }
}

export function JournalPage() {
  const [params, setParams] = useSearchParams()
  const currentMonth = monthKey(useToday())
  const rawMonth = params.get('m') ?? ''
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : currentMonth
  const view: View = params.get('view') === 'calendar' ? 'calendar' : 'list'
  const rawDay = params.get('d') ?? ''
  const selectedDay = DAY_PATTERN.test(rawDay) && rawDay.startsWith(month) ? rawDay : null

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes))
      if (value === null) next.delete(key)
      else next.set(key, value)
    setParams(next, { replace: true })
  }
  const goToMonth = (target: string) =>
    update({ m: target === currentMonth ? null : target, d: null })

  const profile = useProfile()
  const currency = profile.data?.settings.defaultCurrency
  const range = useMemo(
    () => (selectedDay ? dayRange(selectedDay) : monthRange(month)),
    [month, selectedDay],
  )
  const list = useExpenseList(range)
  const calendar = useCalendarMonth(month, currency)
  const budget = useBudget(month, currency)
  const { index: categories } = useCategoryIndex()

  const expenses = list.data?.pages.flatMap((page) => page.data) ?? []
  const otherTotals = (list.data?.pages[0]?.totals ?? []).filter(
    (total) => total.currency !== currency,
  )
  const groups = groupByDay(expenses)
  const highlights = (calendar.data?.days ?? []).flatMap((day) => day.mediaAssetIds).slice(0, 4)
  const isFirstTime = profile.data?.expenseCount === 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nhật ký"
        title={formatMonthTitle(month)}
        actions={
          <div className="flex items-center gap-1" role="group" aria-label="Chọn tháng">
            <Button
              variant="secondary"
              size="md"
              className="!px-3"
              aria-label="Tháng trước"
              onClick={() => goToMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={month === currentMonth}
              onClick={() => goToMonth(currentMonth)}
            >
              Hôm nay
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="!px-3"
              aria-label="Tháng sau"
              disabled={month >= currentMonth}
              onClick={() => goToMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-muted">Đã chi trong tháng</p>
            {calendar.isPending || !currency ? (
              <Skeleton className="mt-2 h-12 w-56" />
            ) : (
              <p className="mt-1 text-4xl font-black tracking-tight tabular-nums sm:text-5xl">
                {formatMoney(calendar.data?.totalMinor ?? '0', currency)}
              </p>
            )}
            <p className="mt-1 text-sm text-muted">
              {calendar.data ? `${calendar.data.count} khoản chi` : ' '}
              {otherTotals.length > 0
                ? ` · cùng ${otherTotals
                    .map((total) => formatMoney(total.totalMinor, total.currency))
                    .join(', ')}`
                : ''}
            </p>
            <BudgetLine budget={budget.data} currency={currency} />
          </div>
          {highlights.length > 0 ? (
            <ul aria-label="Ảnh nổi bật trong tháng" className="hidden gap-2 sm:flex">
              {highlights.map((id, position) => (
                <li key={id} className={position % 2 === 0 ? '-rotate-3' : 'rotate-3'}>
                  <MediaThumb
                    mediaId={id}
                    className="size-20 rounded-2xl border-4 border-surface shadow-card"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Cách xem"
          value={view}
          onChange={(next) => update({ view: next === 'list' ? null : next })}
          options={[
            {
              value: 'list',
              text: 'Danh sách',
              label: (
                <>
                  <List className="size-4" aria-hidden /> Danh sách
                </>
              ),
            },
            {
              value: 'calendar',
              text: 'Lịch',
              label: (
                <>
                  <CalendarDays className="size-4" aria-hidden /> Lịch
                </>
              ),
            },
          ]}
        />
        {selectedDay ? (
          <button
            type="button"
            onClick={() => update({ d: null })}
            className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1.5 text-sm font-semibold text-[#8f3519] hover:bg-coral/30"
          >
            {formatDayHeading(selectedDay)}
            <X className="size-4" aria-label="Bỏ lọc ngày" />
          </button>
        ) : null}
      </div>

      {view === 'calendar' ? (
        <>
          <CalendarView
            month={month}
            data={calendar.data}
            currency={currency ?? 'VND'}
            selectedDay={selectedDay}
            onSelectDay={(day) => update({ d: day })}
          />
          {selectedDay ? (
            <ExpenseGroups status={list} groups={groups} categories={categories} />
          ) : null}
        </>
      ) : list.isPending ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : expenses.length === 0 ? (
        isFirstTime ? (
          <EmptyState
            icon={<BookHeart className="size-6" aria-hidden />}
            title="Cuốn nhật ký của bạn còn trống"
            action={
              <Link to="/journal/new" className={buttonClass('accent', 'lg')}>
                <Plus className="size-5" aria-hidden /> Ghi khoản chi đầu tiên
              </Link>
            }
          >
            Chụp một bức ảnh, thêm số tiền — vậy là bạn đã có trang nhật ký đầu tiên.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<BookHeart className="size-6" aria-hidden />}
            title={selectedDay ? 'Ngày này chưa có khoản chi' : 'Tháng này chưa có khoản chi'}
            action={
              <Link to="/journal/new" className={buttonClass('primary', 'md')}>
                <Plus className="size-4" aria-hidden /> Thêm chi tiêu
              </Link>
            }
          >
            Những khoản bạn ghi sẽ xuất hiện ở đây, nhóm theo từng ngày.
          </EmptyState>
        )
      ) : (
        <ExpenseGroups status={list} groups={groups} categories={categories} />
      )}
    </div>
  )
}

type Group = { day: string; items: Expense[] }

function groupByDay(expenses: Expense[]): Group[] {
  const groups: Group[] = []
  for (const expense of expenses) {
    const day = dayKey(new Date(expense.occurredAt))
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(expense)
    else groups.push({ day, items: [expense] })
  }
  return groups
}

function ExpenseGroups({
  status,
  groups,
  categories,
}: {
  status: ReturnType<typeof useExpenseList>
  groups: Group[]
  categories: ReturnType<typeof useCategoryIndex>['index']
}) {
  if (status.isPending) return <Skeleton className="h-24" />
  if (status.isError)
    return <ErrorState error={status.error} onRetry={() => void status.refetch()} />
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const totals = new Map<string, bigint>()
        for (const item of group.items)
          totals.set(item.currency, (totals.get(item.currency) ?? 0n) + BigInt(item.amountMinor))
        return (
          <section key={group.day} aria-labelledby={`day-${group.day}`}>
            <div className="mb-1 flex items-baseline justify-between gap-4 px-3">
              <h2 id={`day-${group.day}`} className="text-sm font-bold text-muted">
                {formatDayHeading(group.day)}
              </h2>
              <p className="text-sm font-bold tabular-nums text-muted">
                {[...totals].map(([code, value]) => formatMoney(value, code)).join(' + ')}
              </p>
            </div>
            <Card className="p-1.5">
              <ul className="divide-y divide-line/70">
                {group.items.map((expense) => (
                  <li key={expense.id}>
                    <ExpenseRow expense={expense} category={categories.get(expense.categoryId)} />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )
      })}
      {status.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={status.isFetchingNextPage}
            onClick={() => void status.fetchNextPage()}
          >
            Tải thêm
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function BudgetLine({
  budget,
  currency,
}: {
  budget: ReturnType<typeof useBudget>['data']
  currency: string | undefined
}) {
  if (!budget || !currency) return null
  if (!budget.isSet || !budget.limitMinor)
    return (
      <Link
        to="/stats"
        className="mt-3 inline-block text-sm font-semibold text-coral-strong underline"
      >
        Đặt ngân sách cho tháng này
      </Link>
    )
  const spent = Number(budget.spentMinor)
  const limit = Number(budget.limitMinor)
  const over = spent > limit
  return (
    <div className="mt-4 max-w-md">
      <ProgressBar
        value={spent}
        max={limit}
        label="Ngân sách tháng"
        tone={over ? 'danger' : spent / limit >= 0.8 ? 'coral' : 'sage'}
      />
      <p className="mt-1.5 text-sm text-muted">
        {over
          ? `Vượt ngân sách ${formatMoney(String(spent - limit), currency)}`
          : `Còn ${formatMoney(budget.remainingMinor ?? '0', currency)} trong ngân sách ${formatMoney(budget.limitMinor, currency)}`}
      </p>
    </div>
  )
}
