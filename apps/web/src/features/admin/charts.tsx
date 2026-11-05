import { formatNumber } from './format'

export type Segment = { key: string; label: string; value: number; color: string }

/** One horizontal bar split into proportional segments, with a legend that carries the numbers. */
export function StackedBar({ segments, caption }: { segments: Segment[]; caption: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div>
      <div
        role="img"
        aria-label={`${caption}: ${segments.map((s) => `${s.label} ${formatNumber(s.value)}`).join(', ')}`}
        className="flex h-3 overflow-hidden rounded-full bg-sunken"
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              key={segment.key}
              style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            />
          ) : null,
        )}
      </div>
      <Legend segments={segments} />
    </div>
  )
}

export function Legend({ segments }: { segments: Segment[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {segments.map((segment) => (
        <li key={segment.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: segment.color }}
          />
          {segment.label}
          <span className="font-semibold tabular-nums text-ink">{formatNumber(segment.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export type Column = { key: string; label: string; segments: Segment[] }

/** Stacked columns over time; the full figures live in the table next to it for assistive tech. */
export function StackedColumns({ columns, caption }: { columns: Column[]; caption: string }) {
  const totals = columns.map((column) => column.segments.reduce((sum, s) => sum + s.value, 0))
  const max = Math.max(...totals, 1)
  return (
    <div role="img" aria-label={caption}>
      <div className="flex h-44 items-end gap-1.5 border-b border-line">
        {columns.map((column, index) => (
          <div
            key={column.key}
            title={`${column.label}: ${column.segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              className="flex flex-col-reverse overflow-hidden rounded-t-md"
              style={{ height: `${(totals[index] / max) * 100}%` }}
            >
              {column.segments.map((segment) => (
                <span
                  key={segment.key}
                  style={{
                    flexGrow: segment.value,
                    backgroundColor: segment.color,
                    minHeight: segment.value > 0 ? 2 : 0,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {columns.map((column, index) => (
          <span
            key={column.key}
            className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-muted"
          >
            {columns.length <= 10 || index % Math.ceil(columns.length / 8) === 0
              ? column.label
              : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
