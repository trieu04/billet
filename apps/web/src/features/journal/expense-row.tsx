import { Link } from 'react-router-dom'
import type { Category } from '@/components/category'
import { MediaThumb } from '@/components/media-thumb'
import { formatTime } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Expense } from './api'

export function ExpenseRow({ expense, category }: { expense: Expense; category?: Category }) {
  const title = expense.merchant || expense.caption || category?.name || 'Khoản chi'
  const detail = [category?.name, expense.merchant && expense.caption ? expense.caption : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <Link
      to={`/journal/${expense.id}`}
      className="group flex items-center gap-4 rounded-2xl p-3 transition hover:bg-sunken/70"
    >
      <MediaThumb mediaId={expense.mediaAssetId} category={category} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{title}</p>
        <p className="truncate text-sm text-muted">
          {formatTime(expense.occurredAt)}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      <p className="shrink-0 text-right font-black tabular-nums">
        {formatMoney(expense.amountMinor, expense.currency)}
      </p>
    </Link>
  )
}
