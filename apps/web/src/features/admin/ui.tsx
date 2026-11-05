/* oxlint-disable react/only-export-components, react/static-components */
import type { PropsWithChildren, ReactNode } from 'react'
import { buttonClass } from '@/components/button'
import { Badge, ErrorState, inputClass as sharedInputClass, Spinner } from '@/components/ui'

export { ErrorState }
export const inputClass = sharedInputClass
export const primaryButtonClass = buttonClass('primary', 'md')
export const secondaryButtonClass = buttonClass('secondary', 'md')

export function Section({
  title,
  description,
  actions,
  children,
}: PropsWithChildren<{ title: string; description?: string; actions?: ReactNode }>) {
  return (
    <section className="rounded-2xl border border-line bg-surface shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

type TileTone = 'default' | 'good' | 'warn'
const TILE_ACCENT: Record<TileTone, string> = {
  default: 'bg-line-strong',
  good: 'bg-sage',
  warn: 'bg-coral',
}

/** A headline figure. The label is the `dt` and the value the very next `dd`. */
export function Tile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: TileTone
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 pl-5 shadow-card">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TILE_ACCENT[tone]}`} />
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-black tracking-tight tabular-nums">{value}</dd>
      {hint ? <dd className="mt-1 text-xs text-muted">{hint}</dd> : null}
    </div>
  )
}

/** Wide tables scroll inside their own focusable region so the page never scrolls sideways. */
export function DataTable({
  caption,
  headers,
  children,
}: PropsWithChildren<{ caption: string; headers: ReactNode[] }>) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-sunken/60 text-xs uppercase tracking-wide text-muted">
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="whitespace-nowrap px-4 py-2.5 font-semibold first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums [&_tr:hover]:bg-sunken/40">{children}</tbody>
      </table>
    </div>
  )
}

export function Cell({ children, align }: PropsWithChildren<{ align?: 'right' }>) {
  return (
    <td
      className={`whitespace-nowrap border-t border-line/70 px-4 py-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6 ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      {children}
    </td>
  )
}

export function EmptyState({ children }: PropsWithChildren) {
  return (
    <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  )
}

export function LoadingState() {
  return <Spinner />
}

type PillTone = 'good' | 'warn' | 'bad' | 'muted'
const PILL_TONE: Record<PillTone, 'sage' | 'honey' | 'danger' | 'neutral'> = {
  good: 'sage',
  warn: 'honey',
  bad: 'danger',
  muted: 'neutral',
}

export function StatusPill({ tone, children }: PropsWithChildren<{ tone: PillTone }>) {
  return <Badge tone={PILL_TONE[tone]}>{children}</Badge>
}

/** Confidence (0–1) as a number with a thin bar behind it. */
export function Meter({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="flex min-w-24 items-center gap-2">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-sage" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums">{percent}%</span>
    </div>
  )
}

/** Proportional bar for ranked lists: shows how a count compares with the largest one. */
export function RankBar({ value, max }: { value: number; max: number }) {
  return (
    <div aria-hidden className="h-1.5 w-28 overflow-hidden rounded-full bg-sunken">
      <div
        className="h-full rounded-full bg-ink/70"
        style={{ width: `${max === 0 ? 0 : (value / max) * 100}%` }}
      />
    </div>
  )
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="break-all text-right font-semibold">{value}</dd>
    </div>
  )
}
