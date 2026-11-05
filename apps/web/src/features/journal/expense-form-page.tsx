import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/button'
import { CategoryIcon, type Category } from '@/components/category'
import { Dialog } from '@/components/dialog'
import { useToast } from '@/components/toast'
import { ErrorState, Field, inputClass, PageHeader, Skeleton, textareaClass } from '@/components/ui'
import { useApi } from '@/lib/api-client'
import {
  browserTimezone,
  fromDateTimeLocal,
  monthKey,
  toDateTimeLocal,
  useToday,
} from '@/lib/dates'
import { amountToInput, CURRENCIES, formatMoney, parseAmount } from '@/lib/money'
import { type Profile, useCategories, useInvalidateExpenseData, useProfile } from '@/lib/queries'
import { type Expense, useExpense } from './api'
import { PhotoField } from './photo-field'
import { preparePhoto, uploadPhoto } from './photo-upload'

/** `/journal/new` creates an expense; `/journal/:id` edits an existing one. */
export function ExpenseFormPage() {
  const { id } = useParams()
  const profile = useProfile()
  const categories = useCategories()
  const expense = useExpense(id)

  const failure = [profile, categories, id ? expense : null].find((query) => query?.isError)
  if (failure?.isError)
    return <ErrorState error={failure.error} onRetry={() => void failure.refetch()} />
  if (!profile.data || !categories.data || (id && !expense.data))
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  return (
    <ExpenseForm
      key={expense.data ? `${expense.data.id}:${expense.data.version}` : 'new'}
      expense={id ? expense.data : undefined}
      profile={profile.data}
      categories={categories.data}
    />
  )
}

function ExpenseForm({
  expense,
  profile,
  categories,
}: {
  expense?: Expense
  profile: Profile
  categories: Category[]
}) {
  const api = useApi()
  const navigate = useNavigate()
  const toast = useToast()
  const invalidate = useInvalidateExpenseData()
  const idempotencyKey = useRef(crypto.randomUUID())
  const uploaded = useRef<{ file: File; id: string } | null>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [currency, setCurrency] = useState(expense?.currency ?? profile.settings.defaultCurrency)
  const [amount, setAmount] = useState(
    expense ? amountToInput(expense.amountMinor, expense.currency) : '',
  )
  const [occurredAt, setOccurredAt] = useState(() =>
    toDateTimeLocal(expense ? new Date(expense.occurredAt) : new Date()),
  )
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '')
  const [merchant, setMerchant] = useState(expense?.merchant ?? '')
  const [caption, setCaption] = useState(expense?.caption ?? '')
  const [location, setLocation] = useState(expense?.location ?? '')
  const [errors, setErrors] = useState<{ amount?: string; occurredAt?: string }>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const minor = parseAmount(amount, currency)
  const today = useToday()
  const month = monthKey(new Date(fromDateTimeLocal(occurredAt) ?? today))
  const afterSave = () => navigate(`/journal${month === monthKey(today) ? '' : `?m=${month}`}`)

  const save = useMutation({
    mutationFn: async () => {
      let mediaAssetId = expense?.mediaAssetId ?? undefined
      if (photo) {
        if (uploaded.current?.file !== photo)
          uploaded.current = { file: photo, id: await uploadPhoto(api, await preparePhoto(photo)) }
        mediaAssetId = uploaded.current.id
      }
      const shared = {
        amountMinor: minor,
        currency,
        occurredAt: fromDateTimeLocal(occurredAt),
        occurredTimezone: browserTimezone(),
        categoryId: categoryId || undefined,
        mediaAssetId,
      }
      if (expense)
        return api<Expense>(`/expenses/${expense.id}`, {
          method: 'PATCH',
          json: {
            ...shared,
            merchant: merchant.trim(),
            caption: caption.trim(),
            location: location.trim(),
            version: expense.version,
          },
        })
      return api<Expense>('/expenses', {
        method: 'POST',
        json: {
          ...shared,
          merchant: merchant.trim() || undefined,
          caption: caption.trim() || undefined,
          location: location.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
        },
      })
    },
    onSuccess: async () => {
      await invalidate()
      toast.show(expense ? 'Đã lưu thay đổi' : 'Đã thêm vào nhật ký')
      afterSave()
    },
  })

  const remove = useMutation({
    mutationFn: () => api(`/expenses/${expense?.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidate()
      toast.show('Đã xóa khoản chi')
      setConfirmingDelete(false)
      afterSave()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!minor) next.amount = 'Nhập số tiền lớn hơn 0, ví dụ 55000.'
    if (!fromDateTimeLocal(occurredAt)) next.occurredAt = 'Chọn thời điểm hợp lệ.'
    setErrors(next)
    if (Object.keys(next).length === 0) save.mutate()
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/journal"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Nhật ký
      </Link>
      <PageHeader
        title={expense ? 'Sửa khoản chi' : 'Thêm chi tiêu'}
        description={
          expense ? undefined : 'Giữ lại khoảnh khắc và con số — phần còn lại Billet lo.'
        }
        actions={
          expense ? (
            <Button
              variant="ghost"
              className="text-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-4" aria-hidden /> Xóa
            </Button>
          ) : null
        }
      />

      <form onSubmit={submit} noValidate className="mt-6 grid gap-8 md:grid-cols-[5fr_6fr]">
        <PhotoField
          existingMediaId={expense?.mediaAssetId ?? null}
          file={photo}
          onChange={setPhoto}
        />

        <div className="space-y-5">
          <div>
            <label htmlFor="amount" className="mb-1.5 block text-sm font-semibold">
              Số tiền
            </label>
            <div className="flex gap-2">
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={amount}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby="amount-help"
                onChange={(event) => setAmount(event.target.value)}
                className={`${inputClass} !h-16 !text-3xl font-black tabular-nums`}
              />
              <select
                aria-label="Đơn vị tiền tệ"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={`${inputClass} !h-16 !w-28 shrink-0 font-bold`}
              >
                {CURRENCIES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </div>
            <p
              id="amount-help"
              role={errors.amount ? 'alert' : undefined}
              className={`mt-1.5 text-sm ${errors.amount ? 'text-danger' : 'text-muted'}`}
            >
              {errors.amount ??
                (minor ? `= ${formatMoney(minor, currency)}` : 'Nhập số tiền bạn đã chi.')}
            </p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Danh mục</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {sorted.map((category) => (
                <label key={category.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={categoryId === category.id}
                    onChange={() => setCategoryId(category.id)}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface p-2.5 text-center text-xs font-semibold transition hover:border-ink peer-checked:border-coral-strong peer-checked:bg-coral-soft peer-checked:ring-2 peer-checked:ring-coral peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-coral">
                    <CategoryIcon category={category} />
                    <span className="line-clamp-2">{category.name}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Bỏ trống sẽ xếp vào “Khác”. Bạn có thể thêm danh mục riêng ở mục Danh mục.
            </p>
          </fieldset>

          <Field label="Thời điểm" error={errors.occurredAt}>
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Cửa hàng hoặc nơi chi">
            {(props) => (
              <input
                {...props}
                value={merchant}
                maxLength={160}
                placeholder="Ví dụ: Phở đầu ngõ"
                onChange={(event) => setMerchant(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Ghi chú" hint="Vài dòng để nhớ ngữ cảnh của khoản chi.">
            {(props) => (
              <textarea
                {...props}
                value={caption}
                maxLength={500}
                rows={3}
                onChange={(event) => setCaption(event.target.value)}
                className={textareaClass}
              />
            )}
          </Field>
          <Field label="Địa điểm">
            {(props) => (
              <input
                {...props}
                value={location}
                maxLength={240}
                onChange={(event) => setLocation(event.target.value)}
                className={inputClass}
              />
            )}
          </Field>

          {save.isError ? <ErrorState error={save.error} /> : null}

          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={save.isPending}
            >
              {save.isPending ? 'Đang lưu…' : expense ? 'Lưu thay đổi' : 'Lưu vào nhật ký'}
            </Button>
            <Link
              to="/journal"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold hover:bg-sunken"
            >
              Hủy
            </Link>
          </div>
        </div>
      </form>

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Xóa khoản chi này?"
        description="Khoản chi sẽ biến mất khỏi nhật ký và thống kê."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Giữ lại
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Xóa khoản chi
            </Button>
          </>
        }
      >
        {remove.isError ? (
          <ErrorState error={remove.error} />
        ) : (
          <p className="text-sm text-muted">Thao tác này không thể hoàn tác.</p>
        )}
      </Dialog>
    </div>
  )
}
