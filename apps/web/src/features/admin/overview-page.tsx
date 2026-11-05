import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PageHeader, Segmented, Skeleton } from '@/components/ui'
import { queryString, useAdminRequest } from './api'
import { Legend, type Segment, StackedBar, StackedColumns } from './charts'
import {
  fieldLabel,
  formatCost,
  formatLatency,
  formatNumber,
  formatPercent,
  outcomeLabel,
  reasonLabel,
  statusLabel,
} from './format'
import type { Summary } from './types'
import { Cell, DataTable, EmptyState, ErrorState, RankBar, Section, Tile } from './ui'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]
const DAY_MS = 86_400_000

const STATUS_COLOR: Record<string, string> = {
  succeeded: '#2d7b62',
  unavailable: '#ef764f',
  disabled: '#cfc3b6',
}
const OUTCOME_COLOR: Record<string, string> = {
  accepted: '#2d7b62',
  edited: '#f6c85f',
  entered: '#6b5d53',
  cleared: '#a3281c',
  suggested: '#cfc3b6',
}
const fallbackColor = '#8a7b70'

export function OverviewPage() {
  const request = useAdminRequest()
  const [days, setDays] = useState<Range>(7)
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const summary = useQuery({
    queryKey: ['admin', 'summary', days, timezone],
    queryFn: () => {
      const to = new Date()
      const from = new Date(to.getTime() - days * DAY_MS)
      return request<Summary>(
        `/recognition/summary${queryString({ from: from.toISOString(), to: to.toISOString(), timezone })}`,
      )
    },
  })

  return (
    <>
      <PageHeader
        eyebrow="Nhận diện chi tiêu"
        title="Tổng quan"
        description="Sức khỏe của gợi ý từ ảnh: lượng dùng, độ trễ, chi phí và cách người dùng đón nhận gợi ý."
        actions={
          <Segmented<`${Range}`>
            label="Khoảng thời gian"
            value={`${days}`}
            onChange={(value) => setDays(Number(value) as Range)}
            options={RANGES.map((range) => ({
              value: `${range}` as `${Range}`,
              text: `${range} ngày gần nhất`,
              label: `${range} ngày`,
            }))}
          />
        }
      />
      {summary.isPending ? (
        <div role="status" aria-label="Đang tải" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : null}
      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : null}
      {summary.data ? <SummaryView summary={summary.data} /> : null}
    </>
  )
}

function statusSegments(counts: { succeeded: number; unavailable: number; disabled: number }) {
  return (['succeeded', 'unavailable', 'disabled'] as const).map<Segment>((key) => ({
    key,
    label: statusLabel(key),
    value: counts[key],
    color: STATUS_COLOR[key],
  }))
}

function SummaryView({ summary }: { summary: Summary }) {
  const unavailable = summary.byStatus.find((item) => item.key === 'unavailable')?.count ?? 0
  const unavailableRate = summary.total === 0 ? 0 : unavailable / summary.total
  const outcomes = [...new Set(summary.fieldOutcomes.map((item) => item.outcome))].sort()
  const fields = [...new Set(summary.fieldOutcomes.map((item) => item.field))].sort()
  const maxReason = Math.max(...summary.byReason.map((row) => row.count), 0)
  const maxImageType = Math.max(...summary.byImageType.map((row) => row.count), 0)
  const dailyLabel = `Inference theo ngày, múi giờ ${summary.timezone}`

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Tổng inference" value={formatNumber(summary.total)} />
        <Tile label="Lần gọi provider" value={formatNumber(summary.providerCalls)} />
        <Tile
          label="Tỷ lệ không khả dụng"
          value={formatPercent(unavailable, summary.total)}
          tone={unavailableRate > 0.1 ? 'warn' : 'good'}
          hint={unavailableRate > 0.1 ? 'Cao hơn 10%, nên kiểm tra provider' : undefined}
        />
        <Tile
          label="Độ trễ P50 / P95"
          value={formatLatency(summary.latencyP50Ms)}
          hint={`P95: ${formatLatency(summary.latencyP95Ms)}`}
        />
        <Tile
          label="Chi phí"
          value={formatCost(summary.usage.costMicroUsd)}
          hint={`${formatNumber(summary.usage.inputTokens)} token vào, ${formatNumber(summary.usage.outputTokens)} token ra`}
        />
      </dl>

      <Section title="Theo ngày" description={`Múi giờ ${summary.timezone}`}>
        {summary.daily.length === 0 ? (
          <EmptyState>Không có inference trong khoảng này.</EmptyState>
        ) : (
          <div className="space-y-4">
            <StackedColumns
              caption={dailyLabel}
              columns={summary.daily.map((row) => ({
                key: row.day,
                label: row.day.slice(5).split('-').reverse().join('/'),
                segments: statusSegments(row),
              }))}
            />
            <Legend
              segments={statusSegments({
                succeeded: summary.daily.reduce((sum, row) => sum + row.succeeded, 0),
                unavailable: summary.daily.reduce((sum, row) => sum + row.unavailable, 0),
                disabled: summary.daily.reduce((sum, row) => sum + row.disabled, 0),
              })}
            />
            <details className="rounded-xl border border-line bg-paper/50 px-4 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-semibold">Xem dạng bảng</summary>
              <div className="mt-2 pb-2">
                <DataTable
                  caption="Inference theo ngày"
                  headers={[
                    'Ngày',
                    'Tổng',
                    ...['succeeded', 'unavailable', 'disabled'].map(statusLabel),
                    'Chi phí',
                  ]}
                >
                  {summary.daily.map((row) => (
                    <tr key={row.day}>
                      <Cell>{row.day}</Cell>
                      <Cell>{formatNumber(row.total)}</Cell>
                      <Cell>{formatNumber(row.succeeded)}</Cell>
                      <Cell>{formatNumber(row.unavailable)}</Cell>
                      <Cell>{formatNumber(row.disabled)}</Cell>
                      <Cell>{formatCost(row.costMicroUsd)}</Cell>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          </div>
        )}
      </Section>

      <Section
        title="Kết quả theo trường"
        description="Người dùng xử lý gợi ý thế nào trên các khoản chi đã lưu còn hiệu lực."
      >
        {fields.length === 0 ? (
          <EmptyState>Chưa có khoản chi nào liên kết với inference trong khoảng này.</EmptyState>
        ) : (
          <div className="space-y-5">
            <ul className="grid gap-5 md:grid-cols-2">
              {fields.map((field) => (
                <li key={field}>
                  <p className="mb-2 text-sm font-bold">{fieldLabel(field)}</p>
                  <StackedBar
                    caption={fieldLabel(field)}
                    segments={outcomes.map((outcome) => ({
                      key: outcome,
                      label: outcomeLabel(outcome),
                      color: OUTCOME_COLOR[outcome] ?? fallbackColor,
                      value:
                        summary.fieldOutcomes.find(
                          (item) => item.field === field && item.outcome === outcome,
                        )?.count ?? 0,
                    }))}
                  />
                </li>
              ))}
            </ul>
            <details className="rounded-xl border border-line bg-paper/50 px-4 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-semibold">Xem dạng bảng</summary>
              <div className="mt-2 pb-2">
                <DataTable
                  caption="Kết quả theo trường"
                  headers={['Trường', ...outcomes.map(outcomeLabel)]}
                >
                  {fields.map((field) => (
                    <tr key={field}>
                      <Cell>{fieldLabel(field)}</Cell>
                      {outcomes.map((outcome) => (
                        <Cell key={outcome}>
                          {formatNumber(
                            summary.fieldOutcomes.find(
                              (item) => item.field === field && item.outcome === outcome,
                            )?.count ?? 0,
                          )}
                        </Cell>
                      ))}
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          </div>
        )}
      </Section>

      <Section title="Theo provider và model">
        {summary.byProvider.length === 0 ? (
          <EmptyState>Không có dữ liệu.</EmptyState>
        ) : (
          <DataTable
            caption="Theo provider và model"
            headers={[
              'Provider',
              'Model',
              'Tổng',
              'Lần gọi',
              'Không khả dụng',
              'Token vào',
              'Token ra',
              'Chi phí',
            ]}
          >
            {summary.byProvider.map((row) => (
              <tr key={`${row.provider}/${row.model}`}>
                <Cell>{row.provider}</Cell>
                <Cell>{row.model}</Cell>
                <Cell>{formatNumber(row.total)}</Cell>
                <Cell>{formatNumber(row.providerCalls)}</Cell>
                <Cell>{formatNumber(row.unavailable)}</Cell>
                <Cell>{formatNumber(row.inputTokens)}</Cell>
                <Cell>{formatNumber(row.outputTokens)}</Cell>
                <Cell>{formatCost(row.costMicroUsd)}</Cell>
              </tr>
            ))}
          </DataTable>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Lý do không có gợi ý">
          {summary.byReason.length === 0 ? (
            <EmptyState>Không có.</EmptyState>
          ) : (
            <DataTable caption="Lý do không có gợi ý" headers={['Lý do', 'Số lần']}>
              {summary.byReason.map((row) => (
                <tr key={row.key}>
                  <Cell>{reasonLabel(row.key)}</Cell>
                  <Cell>
                    <span className="flex items-center gap-3">
                      <span className="w-8 font-semibold">{formatNumber(row.count)}</span>
                      <RankBar value={row.count} max={maxReason} />
                    </span>
                  </Cell>
                </tr>
              ))}
            </DataTable>
          )}
        </Section>
        <Section title="Loại ảnh được chọn">
          {summary.byImageType.length === 0 ? (
            <EmptyState>Không có.</EmptyState>
          ) : (
            <DataTable caption="Loại ảnh được chọn" headers={['Loại ảnh', 'Số lần']}>
              {summary.byImageType.map((row) => (
                <tr key={row.key}>
                  <Cell>{row.key}</Cell>
                  <Cell>
                    <span className="flex items-center gap-3">
                      <span className="w-8 font-semibold">{formatNumber(row.count)}</span>
                      <RankBar value={row.count} max={maxImageType} />
                    </span>
                  </Cell>
                </tr>
              ))}
            </DataTable>
          )}
        </Section>
      </div>
    </>
  )
}
