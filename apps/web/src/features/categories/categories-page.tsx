import { useMutation } from '@tanstack/react-query'
import { Archive, Pencil, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/button'
import {
  CATEGORY_COLORS,
  CATEGORY_ICON_OPTIONS,
  CategoryIcon,
  type Category,
} from '@/components/category'
import { Dialog } from '@/components/dialog'
import { useToast } from '@/components/toast'
import { Card, ErrorState, Field, inputClass, PageHeader, Skeleton } from '@/components/ui'
import { useApi } from '@/lib/api-client'
import { useCategories, useInvalidateExpenseData } from '@/lib/queries'

export function CategoriesPage() {
  const categories = useCategories()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [archiving, setArchiving] = useState<Category | null>(null)
  const custom = (categories.data ?? []).filter((category) => category.isCustom)
  const system = (categories.data ?? []).filter((category) => !category.isCustom)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Danh mục"
        title="Phân loại theo cách của bạn"
        description="Thêm danh mục riêng cho những khoản chi bạn hay gặp. Danh mục mặc định luôn có sẵn."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden /> Thêm danh mục
          </Button>
        }
      />

      {categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <section aria-labelledby="custom-heading">
            <h2 id="custom-heading" className="mb-2 px-1 text-sm font-bold text-muted">
              Danh mục của bạn
            </h2>
            {custom.length === 0 ? (
              <Card className="px-5 py-8 text-center text-sm text-muted">
                Bạn chưa tạo danh mục riêng nào.{' '}
                <button
                  type="button"
                  className="font-semibold text-coral-strong underline"
                  onClick={() => setEditing('new')}
                >
                  Tạo danh mục đầu tiên
                </button>
              </Card>
            ) : (
              <Card className="p-1.5">
                <ul className="divide-y divide-line/70">
                  {custom.map((category) => (
                    <li key={category.id} className="flex items-center gap-3 p-3">
                      <CategoryIcon category={category} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{category.name}</p>
                        <p className="text-sm text-muted">{category.usageCount} khoản chi</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Sửa ${category.name}`}
                        onClick={() => setEditing(category)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Lưu trữ ${category.name}`}
                        onClick={() => setArchiving(category)}
                      >
                        <Archive className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section aria-labelledby="system-heading">
            <h2 id="system-heading" className="mb-2 px-1 text-sm font-bold text-muted">
              Mặc định
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {system.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
                >
                  <CategoryIcon category={category} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{category.name}</p>
                    <p className="text-xs text-muted">{category.usageCount} khoản chi</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {editing ? (
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {archiving ? <ArchiveDialog category={archiving} onClose={() => setArchiving(null)} /> : null}
    </div>
  )
}

function CategoryDialog({ category, onClose }: { category: Category | null; onClose(): void }) {
  const api = useApi()
  const toast = useToast()
  const invalidate = useInvalidateExpenseData()
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color.toUpperCase() ?? CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(category?.icon ?? 'coffee')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      category
        ? api(`/categories/${category.id}`, {
            method: 'PATCH',
            json: { name: name.trim(), color, icon },
          })
        : api('/categories', { method: 'POST', json: { name: name.trim(), color, icon } }),
    onSuccess: async () => {
      await invalidate()
      toast.show(category ? 'Đã lưu danh mục' : 'Đã thêm danh mục')
      onClose()
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Hãy đặt tên cho danh mục.')
    setError(null)
    save.mutate()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? 'Sửa danh mục' : 'Danh mục mới'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="category-form" loading={save.isPending}>
            {category ? 'Lưu' : 'Thêm danh mục'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-sunken p-3">
          <CategoryIcon category={{ color, icon }} size="lg" />
          <p className="truncate font-bold">{name.trim() || 'Tên danh mục'}</p>
        </div>
        <Field label="Tên danh mục" error={error}>
          {(props) => (
            <input
              {...props}
              autoFocus
              maxLength={80}
              placeholder="Ví dụ: Cà phê sáng"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Màu sắc</legend>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORY_COLORS.map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={value}
                  checked={color === value}
                  onChange={() => setColor(value)}
                  aria-label={`Màu ${value}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="block size-9 rounded-full ring-offset-2 ring-offset-surface transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-coral-strong"
                  style={{ backgroundColor: value }}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Biểu tượng</legend>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {CATEGORY_ICON_OPTIONS.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="icon"
                  value={option.value}
                  checked={icon === option.value}
                  onChange={() => setIcon(option.value)}
                  aria-label={option.label}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  title={option.label}
                  className="grid aspect-square place-items-center rounded-xl border border-line bg-surface text-ink transition hover:border-ink peer-checked:border-coral-strong peer-checked:bg-coral-soft peer-checked:ring-2 peer-checked:ring-coral peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-coral"
                >
                  <option.icon className="size-5" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {save.isError ? <ErrorState error={save.error} /> : null}
      </form>
    </Dialog>
  )
}

function ArchiveDialog({ category, onClose }: { category: Category; onClose(): void }) {
  const api = useApi()
  const toast = useToast()
  const invalidate = useInvalidateExpenseData()
  const archive = useMutation({
    mutationFn: () => api(`/categories/${category.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidate()
      toast.show('Đã lưu trữ danh mục')
      onClose()
    },
  })
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Lưu trữ “${category.name}”?`}
      description="Danh mục sẽ không còn xuất hiện khi chọn. Các khoản chi cũ vẫn giữ nguyên."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Giữ lại
          </Button>
          <Button variant="danger" loading={archive.isPending} onClick={() => archive.mutate()}>
            Lưu trữ
          </Button>
        </>
      }
    >
      {archive.isError ? <ErrorState error={archive.error} /> : null}
    </Dialog>
  )
}
