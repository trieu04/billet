import { ImagePlus, RefreshCw, X } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo } from 'react'
import { useMediaUrl } from '@/lib/queries'

/** Photo picker: shows the saved photo or a new selection, with a drop target for choosing one. */
export function PhotoField({
  existingMediaId,
  file,
  onChange,
  error,
}: {
  existingMediaId: string | null
  file: File | null
  onChange(file: File | null): void
  error?: string | null
}) {
  const existingUrl = useMediaUrl(file ? null : existingMediaId)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )
  const shown = previewUrl ?? existingUrl
  const hasPhoto = Boolean(file || existingMediaId)

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null
    event.target.value = ''
    if (picked) onChange(picked)
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">Ảnh khoảnh khắc</p>
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-3xl border-2 ${
          shown ? 'border-line bg-sunken' : 'border-dashed border-line-strong bg-surface'
        } focus-within:ring-4 focus-within:ring-coral/30`}
      >
        {shown ? (
          <img src={shown} alt="Ảnh của khoản chi" className="size-full object-cover" />
        ) : hasPhoto ? (
          <div className="size-full animate-pulse bg-sunken" aria-label="Đang tải ảnh" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-coral-soft text-coral-strong">
              <ImagePlus className="size-7" aria-hidden />
            </span>
            <p className="font-bold">Thêm ảnh món ăn, hóa đơn hay món đồ</p>
            <p className="text-sm text-muted">
              Chụp mới hoặc chọn từ thư viện. Ảnh có thể để trống.
            </p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          aria-label={hasPhoto ? 'Đổi ảnh' : 'Chọn ảnh'}
          onChange={choose}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        {hasPhoto ? (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <RefreshCw className="size-3.5" aria-hidden /> Chạm để đổi ảnh
          </span>
        ) : null}
      </div>
      {file ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden /> Bỏ ảnh vừa chọn
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
