import { formatCompactMoney, formatMoney } from '@/lib/money'

type Point = { bucket: string; totalMinor: number; count: number }

function label(bucket: string): string {
  const parts = bucket.split('-')
  return parts.length === 2
    ? `T${Number(parts[1])}/${parts[0].slice(2)}`
    : `${Number(parts[2])}/${Number(parts[1])}`
}

/** Column chart of spending per bucket, with a screen-reader table behind it. */
export function BarChart({
  points,
  currency,
  caption,
}: {
  points: Point[]
  currency: string
  caption: string
}) {
  const max = Math.max(...points.map((point) => point.totalMinor), 0)
  const peak = points.find((point) => point.totalMinor === max && max > 0)
  const every = points.length > 16 ? Math.ceil(points.length / 8) : 1
  return (
    <figure>
      <figcaption className="sr-only">{caption}</figcaption>
      <div aria-hidden className="flex h-52 items-end gap-[3px] border-b border-line pt-6 sm:gap-1">
        {points.map((point) => {
          const height = max === 0 ? 0 : Math.max(2, (point.totalMinor / max) * 100)
          const isPeak = point === peak
          return (
            <div
              key={point.bucket}
              title={`${label(point.bucket)}: ${formatMoney(String(point.totalMinor), currency)} (${point.count} khoản)`}
              className="group relative flex h-full min-w-0 flex-1 items-end"
            >
              {isPeak ? (
                <span className="absolute inset-x-0 -top-0.5 -translate-y-full whitespace-nowrap text-center text-[11px] font-bold tabular-nums text-coral-strong">
                  {formatCompactMoney(String(point.totalMinor), currency)}
                </span>
              ) : null}
              <div
                className={`w-full rounded-t-md transition-colors ${
                  point.totalMinor === 0
                    ? 'bg-sunken'
                    : isPeak
                      ? 'bg-coral'
                      : 'bg-ink/80 group-hover:bg-coral'
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
          )
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-[3px] sm:gap-1">
        {points.map((point, index) => (
          <span
            key={point.bucket}
            className="min-w-0 flex-1 text-center text-[10px] font-medium text-muted"
          >
            {index % every === 0 ? label(point.bucket) : ''}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Kỳ</th>
            <th scope="col">Số khoản</th>
            <th scope="col">Tổng chi</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.bucket}>
              <th scope="row">{label(point.bucket)}</th>
              <td>{point.count}</td>
              <td>{formatMoney(String(point.totalMinor), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
