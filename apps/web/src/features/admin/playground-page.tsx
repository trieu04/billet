import { useMutation, useQuery } from '@tanstack/react-query'
import { ImagePlus } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/button'
import { PageHeader, Skeleton } from '@/components/ui'
import { useAdminRequest } from './api'
import { compressForDecision } from './compress-image'
import {
  formatBytes,
  formatConfidence,
  formatCost,
  formatLatency,
  formatNumber,
  reasonLabel,
  statusLabel,
} from './format'
import type { Catalog, InferenceStatus, PlaygroundResult } from './types'
import { ErrorState, Fact, inputClass, Meter, Section, StatusPill } from './ui'

type Selected = { original: File; compressed: Blob; previewUrl: string }

export function PlaygroundPage() {
  const request = useAdminRequest()
  const catalog = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: () => request<Catalog>('/recognition/catalog'),
  })
  const [selected, setSelected] = useState<Selected | null>(null)
  const [fileError, setFileError] = useState<unknown>(null)
  const [locale, setLocale] = useState('vi-VN')
  const run = useMutation({
    mutationFn: (image: Blob) => {
      const form = new FormData()
      form.append('locale', locale)
      form.append('image', image, 'playground.jpg')
      return request<PlaygroundResult>('/recognition/playground', { method: 'POST', form })
    },
  })
  const previewUrl = selected?.previewUrl
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const header = (
    <PageHeader
      eyebrow="Nhận diện chi tiêu"
      title="Playground"
      description="Gọi provider đang cấu hình với loại ảnh và danh mục hệ thống, tính chi phí thật. Ảnh không được lưu. OCR và rule cá nhân chạy trên thiết bị nên không có trong kết quả."
    />
  )
  if (catalog.isPending)
    return (
      <>
        {header}
        <Skeleton className="h-64" />
      </>
    )
  if (catalog.isError)
    return (
      <>
        {header}
        <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
      </>
    )

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileError(null)
    run.reset()
    setSelected(null)
    if (!file) return
    try {
      const compressed = await compressForDecision(file, catalog.data.decisionImage)
      setSelected({ original: file, compressed, previewUrl: URL.createObjectURL(compressed) })
    } catch (error) {
      setFileError(error instanceof Error ? error : new Error('Không đọc được ảnh này.'))
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (selected) run.mutate(selected.compressed)
  }

  return (
    <>
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Thử provider">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold">Ảnh thử</p>
              <div className="relative grid min-h-48 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-paper/50 focus-within:ring-4 focus-within:ring-coral/30">
                {selected ? (
                  <img
                    src={selected.previewUrl}
                    alt="Ảnh đã nén sẽ được gửi"
                    className="max-h-72 w-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-sm text-muted">
                    <ImagePlus className="mx-auto mb-2 size-8 text-coral-strong" aria-hidden />
                    Chọn một ảnh để thử
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Ảnh"
                  onChange={(event) => void choose(event)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </div>
              {selected ? (
                <p className="mt-2 text-sm text-muted">
                  Gốc {formatBytes(selected.original.size)}, sau nén{' '}
                  {formatBytes(selected.compressed.size)}
                </p>
              ) : null}
            </div>
            <label className="block text-sm font-semibold">
              Ngôn ngữ (locale)
              <input
                className={`${inputClass} mt-1 font-normal`}
                value={locale}
                required
                onChange={(event) => setLocale(event.target.value)}
              />
            </label>
            {fileError ? <ErrorState error={fileError} /> : null}
            <Button type="submit" disabled={!selected} loading={run.isPending} className="w-full">
              {run.isPending ? 'Đang gọi provider…' : 'Chạy thử'}
            </Button>
          </form>
        </Section>

        <div className="space-y-6" aria-live="polite">
          {run.isError ? <ErrorState error={run.error} /> : null}
          {run.data ? (
            <ResultView result={run.data} />
          ) : !run.isError ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center text-sm text-muted">
              Kết quả sẽ hiện ở đây sau khi bạn chạy thử.
            </p>
          ) : null}
        </div>
      </div>
    </>
  )
}

const STATUS_TONE: Record<InferenceStatus, 'good' | 'warn' | 'muted'> = {
  succeeded: 'good',
  unavailable: 'warn',
  disabled: 'muted',
}

function ResultView({ result }: { result: PlaygroundResult }) {
  const imageTypes = result.choices.filter((choice) => choice.kind === 'image_type')
  const categories = result.choices.filter((choice) => choice.kind === 'category')
  return (
    <Section
      title="Kết quả"
      actions={
        <StatusPill tone={STATUS_TONE[result.status]}>
          {statusLabel(result.status)}
          {result.reason ? ` · ${reasonLabel(result.reason)}` : ''}
        </StatusPill>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Pick
          title="Loại ảnh"
          label={result.imageType?.label}
          confidence={result.imageType?.confidence}
        />
        <Pick
          title="Danh mục từ mô hình"
          label={result.category?.label}
          confidence={result.category?.confidence}
          note={
            result.category
              ? result.categoryMeetsThreshold
                ? 'Đạt ngưỡng'
                : 'Dưới ngưỡng'
              : undefined
          }
          good={result.categoryMeetsThreshold}
        />
      </div>
      <dl className="mt-5">
        <Fact label="Provider" value={`${result.provider}/${result.model}`} />
        <Fact
          label="Default rule khớp"
          value={
            result.defaultRule
              ? `${result.defaultRule.categoryName ?? 'Không xác định'} (${formatConfidence(result.defaultRule.confidence)})`
              : 'Không có'
          }
        />
        <Fact label="Độ trễ" value={formatLatency(result.latencyMs)} />
        <Fact label="Dung lượng gửi" value={formatBytes(result.imageBytes)} />
        <Fact
          label="Token vào / ra"
          value={`${formatNumber(result.usage?.inputTokens ?? 0)} / ${formatNumber(result.usage?.outputTokens ?? 0)}`}
        />
        <Fact label="Chi phí" value={formatCost(result.usage?.costMicroUsd ?? 0)} />
      </dl>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold">
          Lựa chọn đã gửi ({imageTypes.length} loại ảnh, {categories.length} danh mục)
        </summary>
        <p className="mt-2 text-muted">Loại ảnh: {imageTypes.map((c) => c.label).join(', ')}</p>
        <p className="mt-1 text-muted">Danh mục: {categories.map((c) => c.label).join(', ')}</p>
      </details>
    </Section>
  )
}

function Pick({
  title,
  label,
  confidence,
  note,
  good,
}: {
  title: string
  label?: string
  confidence?: number
  note?: string
  good?: boolean
}) {
  return (
    <div className="rounded-xl border border-line bg-paper/50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      {label !== undefined && confidence !== undefined ? (
        <>
          <p className="mt-1 text-lg font-black">{label}</p>
          <div className="mt-2">
            <Meter value={confidence} label={`Độ tin cậy ${title.toLowerCase()}`} />
          </div>
          {note ? (
            <p className={`mt-2 text-xs font-semibold ${good ? 'text-sage' : 'text-[#8f3519]'}`}>
              {note}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-1 text-lg font-black text-faint">–</p>
      )}
    </div>
  )
}
