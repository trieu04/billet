import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronDown, Filter, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { PageHeader, Spinner } from '@/components/ui'
import { queryString, useAdminBlobRequest, useAdminRequest } from './api'
import {
  fieldLabel,
  formatBytes,
  formatConfidence,
  formatDateTime,
  formatLatency,
  formatNumber,
  outcomeLabel,
  REASON_OPTIONS,
  reasonLabel,
  sourceLabel,
  STATUS_OPTIONS,
  statusLabel,
} from './format'
import type { Inference, InferenceDetail, InferencePage, InferenceStatus } from './types'
import {
  Cell,
  DataTable,
  EmptyState,
  ErrorState,
  Fact,
  inputClass,
  Meter,
  Section,
  StatusPill,
} from './ui'

type Filters = {
  status: string
  reason: string
  provider: string
  model: string
  imageType: string
  userId: string
  from: string
  to: string
}

const EMPTY: Filters = {
  status: '',
  reason: '',
  provider: '',
  model: '',
  imageType: '',
  userId: '',
  from: '',
  to: '',
}

const FILTER_LABEL: Record<keyof Filters, string> = {
  status: 'Trạng thái',
  reason: 'Lý do',
  provider: 'Provider',
  model: 'Model',
  imageType: 'Loại ảnh',
  userId: 'Người dùng',
  from: 'Từ',
  to: 'Đến trước',
}

const STATUS_TONE: Record<InferenceStatus, 'good' | 'warn' | 'muted'> = {
  succeeded: 'good',
  unavailable: 'warn',
  disabled: 'muted',
}

export function LogsPage() {
  const request = useAdminRequest()
  const [draft, setDraft] = useState(EMPTY)
  const [filters, setFilters] = useState(EMPTY)
  const [openId, setOpenId] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const pages = useInfiniteQuery({
    queryKey: ['admin', 'inferences', filters],
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: InferencePage) => page.nextCursor ?? undefined,
    queryFn: ({ pageParam }) =>
      request<InferencePage>(
        `/recognition/inferences${queryString({
          ...filters,
          from: filters.from ? new Date(filters.from).toISOString() : undefined,
          to: filters.to ? new Date(filters.to).toISOString() : undefined,
          cursor: pageParam,
        })}`,
      ),
  })
  const rows = pages.data?.pages.flatMap((page) => page.data) ?? []
  const activeFilters = (Object.keys(FILTER_LABEL) as (keyof Filters)[]).filter(
    (key) => filters[key] !== '',
  )

  const apply = (next: Filters) => {
    setOpenId(null)
    setFilters(next)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    apply({
      ...draft,
      userId: draft.userId.trim(),
      provider: draft.provider.trim(),
      model: draft.model.trim(),
      imageType: draft.imageType.trim(),
    })
  }
  const clear = (keys: (keyof Filters)[]) => {
    const next = { ...filters }
    for (const key of keys) next[key] = ''
    setDraft(next)
    apply(next)
  }
  const field = (key: keyof Filters, type = 'text') => (
    <label className="text-sm font-semibold">
      {FILTER_LABEL[key]}
      <input
        className={`${inputClass} mt-1 font-normal`}
        type={type}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  )

  return (
    <>
      <PageHeader
        eyebrow="Nhận diện chi tiêu"
        title="Nhật ký inference"
        description="Từng lần gợi ý từ ảnh. Nhật ký không có thông tin định danh. Ảnh gửi cho provider không được lưu; chỉ xem được ảnh của khoản chi đã lưu."
      />

      <Section title="Bộ lọc">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-semibold">
              Trạng thái
              <select
                className={`${inputClass} mt-1 font-normal`}
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                <option value="">Tất cả</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Lý do
              <select
                className={`${inputClass} mt-1 font-normal`}
                value={draft.reason}
                onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
              >
                <option value="">Tất cả</option>
                {REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reasonLabel(reason)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                variant="ghost"
                aria-expanded={advancedOpen}
                aria-controls="advanced-filters"
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                <Filter className="size-4" aria-hidden /> Nâng cao
                <ChevronDown
                  className={`size-4 transition ${advancedOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </Button>
            </div>
          </div>
          <div
            id="advanced-filters"
            hidden={!advancedOpen}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {field('provider')}
            {field('model')}
            {field('imageType')}
            {field('userId')}
            {field('from', 'datetime-local')}
            {field('to', 'datetime-local')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Áp dụng</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(EMPTY)
                apply(EMPTY)
              }}
            >
              Xóa lọc
            </Button>
            {activeFilters.length > 0 ? (
              <ul aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap gap-1.5">
                {activeFilters.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => clear([key])}
                      aria-label={`Bỏ lọc ${FILTER_LABEL[key]}`}
                      className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-xs font-semibold text-[#8f3519] hover:bg-coral/30"
                    >
                      {FILTER_LABEL[key]}:{' '}
                      {key === 'status'
                        ? statusLabel(filters[key])
                        : key === 'reason'
                          ? reasonLabel(filters[key])
                          : filters[key]}
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </form>
      </Section>

      <Section
        title="Inference"
        description={rows.length > 0 ? `${formatNumber(rows.length)} dòng đã tải` : undefined}
      >
        {pages.isPending ? <Spinner /> : null}
        {pages.isError ? (
          <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
        ) : null}
        {pages.isSuccess && rows.length === 0 ? (
          <EmptyState>Không có inference phù hợp.</EmptyState>
        ) : null}
        {rows.length > 0 ? (
          <DataTable
            caption="Danh sách inference"
            headers={[
              'Thời điểm',
              'Người dùng',
              'Trạng thái',
              'Loại ảnh',
              'Danh mục',
              'Độ trễ',
              'Model',
              '',
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id}>
                <Cell>{formatDateTime(row.createdAt)}</Cell>
                <Cell>{row.userId}</Cell>
                <Cell>
                  <span className="flex flex-col items-start gap-1">
                    <StatusPill tone={STATUS_TONE[row.status]}>
                      {statusLabel(row.status)}
                    </StatusPill>
                    {row.reason ? (
                      <span className="text-xs text-muted">{reasonLabel(row.reason)}</span>
                    ) : null}
                  </span>
                </Cell>
                <Cell>
                  {row.imageType ? (
                    <span className="flex flex-col gap-1">
                      <span>{row.imageType.label ?? row.imageType.key}</span>
                      <Meter value={row.imageType.confidence} label="Độ tin cậy loại ảnh" />
                    </span>
                  ) : (
                    '–'
                  )}
                </Cell>
                <Cell>{categoryCell(row)}</Cell>
                <Cell>{row.providerCalled ? formatLatency(row.latencyMs) : 'Không gọi'}</Cell>
                <Cell>
                  <span className="text-xs text-muted">
                    {row.provider}/{row.model}
                  </span>
                </Cell>
                <Cell>
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1 font-semibold text-coral-strong underline underline-offset-2 hover:bg-coral-soft"
                    aria-label={`Chi tiết inference ${row.id}`}
                    onClick={() => setOpenId(row.id)}
                  >
                    Chi tiết
                  </button>
                </Cell>
              </tr>
            ))}
          </DataTable>
        ) : null}
        {pages.hasNextPage ? (
          <Button
            variant="secondary"
            className="mt-5"
            loading={pages.isFetchingNextPage}
            onClick={() => void pages.fetchNextPage()}
          >
            Tải thêm
          </Button>
        ) : null}
      </Section>

      <Dialog
        open={openId !== null}
        onClose={() => setOpenId(null)}
        variant="drawer"
        title="Chi tiết inference"
        description={openId ? `Mã ${openId}` : undefined}
      >
        {openId ? <InferenceDetailView id={openId} /> : null}
      </Dialog>
    </>
  )
}

function categoryCell(row: Inference) {
  if (!row.category) return '–'
  const name = row.category.kind === 'system' ? row.category.name : 'Danh mục cá nhân'
  return (
    <span className="flex flex-col gap-1">
      <span>{name}</span>
      <Meter value={row.category.confidence} label="Độ tin cậy danh mục" />
    </span>
  )
}

function InferenceDetailView({ id }: { id: string }) {
  const request = useAdminRequest()
  const detail = useQuery({
    queryKey: ['admin', 'inference', id],
    queryFn: () => request<InferenceDetail>(`/recognition/inferences/${id}`),
  })
  if (detail.isPending) return <Spinner />
  if (detail.isError)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const { data } = detail
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={STATUS_TONE[data.status]}>{statusLabel(data.status)}</StatusPill>
        {data.reason ? (
          <span className="text-sm text-muted">{reasonLabel(data.reason)}</span>
        ) : null}
      </div>
      <dl>
        <Fact label="Thời điểm" value={formatDateTime(data.createdAt)} />
        <Fact label="Provider / model" value={`${data.provider}/${data.model}`} />
        <Fact label="Dung lượng ảnh" value={formatBytes(data.imageBytes)} />
        <Fact
          label="Độ trễ"
          value={data.providerCalled ? formatLatency(data.latencyMs) : 'Không gọi'}
        />
        <Fact label="Choice set" value={data.choiceSetVersion || '–'} />
        <Fact
          label="Choice cá nhân"
          value={
            data.personalChoice
              ? `Có (${formatConfidence(data.personalChoice.confidence)})`
              : 'Không'
          }
        />
        <Fact label="Token vào" value={formatNumber(data.usage?.inputTokens ?? 0)} />
        <Fact label="Token ra" value={formatNumber(data.usage?.outputTokens ?? 0)} />
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-bold">Khoản chi liên kết</h3>
        {data.linkedExpenses.length === 0 ? (
          <EmptyState>Chưa có khoản chi nào liên kết.</EmptyState>
        ) : (
          <div className="space-y-4">
            {data.linkedExpenses.map((expense, index) => (
              <div key={index} className="space-y-2">
                <DataTable
                  caption={`Khoản chi liên kết ${index + 1}`}
                  headers={['Trường', 'Nguồn', 'Kết quả', 'Tin cậy']}
                >
                  {expense.fields.map((field) => (
                    <tr key={field.field}>
                      <Cell>{fieldLabel(field.field)}</Cell>
                      <Cell>{sourceLabel(field.source)}</Cell>
                      <Cell>{outcomeLabel(field.outcome)}</Cell>
                      <Cell>
                        {field.confidence === null ? '–' : formatConfidence(field.confidence)}
                      </Cell>
                    </tr>
                  ))}
                </DataTable>
                {expense.hasPhoto ? (
                  <LinkedExpensePhoto inferenceId={id} index={index} />
                ) : (
                  <p className="text-sm text-muted">Khoản chi này không có ảnh.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không đọc được ảnh'))
    reader.readAsDataURL(blob)
  })
}

function LinkedExpensePhoto({ inferenceId, index }: { inferenceId: string; index: number }) {
  const requestBlob = useAdminBlobRequest()
  const [open, setOpen] = useState(false)
  const photo = useQuery({
    queryKey: ['admin', 'inference', inferenceId, 'photo', index],
    queryFn: async () =>
      readAsDataUrl(
        await requestBlob(`/recognition/inferences/${inferenceId}/linked-expenses/${index}/photo`),
      ),
    enabled: open,
    gcTime: 0,
  })

  const position = index + 1
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-label={`${open ? 'Ẩn' : 'Xem'} ảnh khoản chi liên kết ${position}`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Ẩn ảnh' : 'Xem ảnh'}
      </Button>
      {open && photo.isPending ? <Spinner /> : null}
      {open && photo.isError ? (
        <ErrorState error={photo.error} onRetry={() => void photo.refetch()} />
      ) : null}
      {open && photo.data ? (
        <>
          <img
            src={photo.data}
            alt={`Ảnh đã lưu của khoản chi liên kết ${position}`}
            className="max-h-96 w-full rounded-xl bg-sunken object-contain"
          />
          <p className="text-xs text-muted">
            Ảnh lưu cùng khoản chi, có thể khác bản nén đã gửi cho provider.
          </p>
        </>
      ) : null}
    </div>
  )
}
