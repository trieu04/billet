import { MediaThumb } from '@/components/media-thumb'
import { daysInMonth, dayKey, firstWeekdayOffset, useToday } from '@/lib/dates'
import { formatCompactMoney } from '@/lib/money'
import type { CalendarMonth } from './api'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Month grid where each day shows its photo and total; choosing a day opens that day's list. */
export function CalendarView({
  month,
  data,
  currency,
  selectedDay,
  onSelectDay,
}: {
  month: string
  data: CalendarMonth | undefined
  currency: string
  selectedDay: string | null
  onSelectDay(day: string): void
}) {
  const byDate = new Map((data?.days ?? []).map((day) => [day.date, day]))
  const today = dayKey(useToday())
  const offset = firstWeekdayOffset(month)
  const total = daysInMonth(month)

  return (
    <div role="group" aria-label={`Lịch chi tiêu ${month}`}>
      <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-xs font-bold uppercase tracking-wider text-muted sm:gap-2">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: offset }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}
        {Array.from({ length: total }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`
          const day = byDate.get(date)
          const spent = Boolean(day && day.count > 0)
          const selected = selectedDay === date
          return (
            <button
              key={date}
              type="button"
              disabled={!spent}
              aria-pressed={selected}
              aria-label={
                spent && day
                  ? `Ngày ${index + 1}: ${day.count} khoản chi, ${formatCompactMoney(day.totalMinor, currency)}`
                  : `Ngày ${index + 1}: không có khoản chi`
              }
              onClick={() => onSelectDay(date)}
              className={`relative aspect-square overflow-hidden rounded-xl border text-left transition sm:rounded-2xl ${
                selected
                  ? 'border-coral-strong ring-2 ring-coral'
                  : spent
                    ? 'border-line bg-surface hover:border-ink'
                    : 'border-transparent bg-sunken/50'
              } ${date === today ? 'outline outline-2 -outline-offset-2 outline-ink' : ''}`}
            >
              {day?.representativeMediaId ? (
                <MediaThumb
                  mediaId={day.representativeMediaId}
                  className="absolute inset-0 size-full"
                />
              ) : null}
              {day?.representativeMediaId ? (
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/20"
                />
              ) : null}
              <span
                aria-hidden
                className={`absolute left-1.5 top-1 text-xs font-bold sm:left-2 sm:top-1.5 sm:text-sm ${
                  day?.representativeMediaId ? 'text-white' : spent ? 'text-ink' : 'text-faint'
                }`}
              >
                {index + 1}
              </span>
              {spent && day ? (
                <span
                  aria-hidden
                  className={`absolute inset-x-1 bottom-1 truncate text-[10px] font-black tabular-nums sm:inset-x-2 sm:bottom-1.5 sm:text-xs ${
                    day.representativeMediaId ? 'text-white' : 'text-coral-strong'
                  }`}
                >
                  {formatCompactMoney(day.totalMinor, currency)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
