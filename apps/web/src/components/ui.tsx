/* oxlint-disable react/only-export-components, react/static-components */
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { type PropsWithChildren, type ReactNode, useId } from 'react'
import { Button } from './button'

export const inputClass =
  'block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-faint transition focus:border-coral-strong focus:outline-none focus:ring-4 focus:ring-coral/20 disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-danger'
export const textareaClass = inputClass.replace('h-11', 'min-h-24 py-2.5')

export function Card({ className = '', children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}

/** Page title block shared by every signed-in page. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-strong">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** A labelled control wired to its hint and error text for assistive technology. */
export function Field({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  className?: string
  children: (props: {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }) => ReactNode
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type Tone = 'neutral' | 'coral' | 'sage' | 'honey' | 'danger'
const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted',
  coral: 'bg-coral-soft text-[#8f3519]',
  sage: 'bg-sage-soft text-[#1d5b45]',
  honey: 'bg-honey-soft text-[#7a5a05]',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', children }: PropsWithChildren<{ tone?: Tone }>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted">
      <LoaderCircle className="size-4 animate-spin" aria-hidden /> {label}
    </p>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-sunken ${className}`} />
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-[#e7b5ae] bg-danger-soft p-4 text-sm text-danger"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="whitespace-pre-line">
          {error instanceof Error ? error.message : 'Không thể tải dữ liệu.'}
        </p>
        {onRetry ? (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            Thử lại
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: PropsWithChildren<{ icon?: ReactNode; title: string; action?: ReactNode }>) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-coral-soft text-coral-strong">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold">{title}</h2>
      {children ? <p className="mt-1 max-w-sm text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

/** A set of mutually exclusive choices rendered as one pill. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode; text: string }[]
  onChange(value: T): void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl bg-sunken p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={option.text}
          onClick={() => onChange(option.value)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
            option.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange(checked: boolean): void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked ? 'bg-sage' : 'bg-line-strong'
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export function ProgressBar({
  value,
  max,
  label,
  tone = 'sage',
}: {
  value: number
  max: number
  label: string
  tone?: 'sage' | 'coral' | 'danger'
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const color = tone === 'sage' ? 'bg-sage' : tone === 'coral' ? 'bg-coral' : 'bg-danger'
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className="h-2.5 overflow-hidden rounded-full bg-sunken"
    >
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  )
}
