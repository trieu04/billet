import { useMutation } from '@tanstack/react-query'
import { Pencil, Wallet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { useToast } from '@/components/toast'
import { Card, ErrorState, Field, inputClass, ProgressBar, Skeleton } from '@/components/ui'
import { useApi } from '@/lib/api-client'
import { formatMoney, amountToInput, parseAmount } from '@/lib/money'
import { formatMonthTitle } from '@/lib/dates'
import { type Budget, useInvalidateExpenseData } from '@/lib/queries'

export function BudgetCard({
  month,
  currency,
  budget,
  loading,
}: {
  month: string
  currency: string
  budget: Budget | undefined
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const spent = Number(budget?.spentMinor ?? 0)
  const limit = Number(budget?.limitMinor ?? 0)
  const over = budget?.isSet && spent > limit
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Wallet className="size-5 text-coral-strong" aria-hidden /> Ngân sách{' '}
            {formatMonthTitle(month).toLowerCase()}
          </h2>
          <p className="mt-0.5 text-sm text-muted">Đặt một mức chi để theo dõi trong tháng.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={loading}>
          <Pencil className="size-3.5" aria-hidden />{' '}
          {budget?.isSet ? 'Chỉnh sửa' : 'Đặt ngân sách'}
        </Button>
      </div>
      {loading ? (
        <Skeleton className="mt-5 h-10" />
      ) : budget?.isSet && budget.limitMinor ? (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-2xl font-black tabular-nums">
              {formatMoney(budget.spentMinor, currency)}
            </p>
            <p className="text-sm text-muted tabular-nums">
              trên {formatMoney(budget.limitMinor, currency)}
            </p>
          </div>
          <ProgressBar
            value={spent}
            max={limit}
            label="Mức đã dùng của ngân sách"
            tone={over ? 'danger' : spent / limit >= 0.8 ? 'coral' : 'sage'}
          />
          <p className={`mt-2 text-sm font-semibold ${over ? 'text-danger' : 'text-muted'}`}>
            {over
              ? `Đã vượt ${formatMoney(String(spent - limit), currency)}`
              : `Còn lại ${formatMoney(budget.remainingMinor ?? '0', currency)}`}
          </p>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
          Chưa có ngân sách cho tháng này. Đã chi {formatMoney(budget?.spentMinor ?? '0', currency)}
          .
        </p>
      )}
      {editing ? (
        <BudgetDialog
          month={month}
          currency={currency}
          current={budget?.limitMinor ?? null}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </Card>
  )
}

function BudgetDialog({
  month,
  currency,
  current,
  onClose,
}: {
  month: string
  currency: string
  current: string | null
  onClose(): void
}) {
  const api = useApi()
  const toast = useToast()
  const invalidate = useInvalidateExpenseData()
  const [value, setValue] = useState(current ? amountToInput(current, currency) : '')
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (limitMinor: string) =>
      api('/budgets', { method: 'PUT', json: { month, currency, limitMinor } }),
    onSuccess: async () => {
      await invalidate()
      toast.show('Đã cập nhật ngân sách')
      onClose()
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const minor = parseAmount(value, currency)
    if (!minor) return setError('Nhập mức ngân sách lớn hơn 0.')
    setError(null)
    save.mutate(minor)
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Ngân sách ${formatMonthTitle(month).toLowerCase()}`}
      description={`Tính bằng ${currency}. Chỉ các khoản chi cùng đơn vị được tính vào.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="budget-form" loading={save.isPending}>
            Lưu ngân sách
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Mức chi tối đa" error={error}>
          {(props) => (
            <input
              {...props}
              inputMode="decimal"
              autoFocus
              placeholder="5000000"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {save.isError ? <ErrorState error={save.error} /> : null}
      </form>
    </Dialog>
  )
}
