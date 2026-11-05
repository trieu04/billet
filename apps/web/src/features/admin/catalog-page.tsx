import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Download, Pencil, Search, Upload } from 'lucide-react'
import { Button, buttonClass } from '@/components/button'
import { Dialog } from '@/components/dialog'
import { PageHeader, Segmented, Skeleton } from '@/components/ui'
import { AdminApiError, useAdminRequest } from './api'
import {
  exportCatalog,
  type ImportPlan,
  parseImport,
  type PlannedChange,
  planImport,
  toCsv,
} from './catalog-transfer'
import type { Catalog, DefaultRule, ImageType, ItemStatus } from './types'
import {
  Cell,
  DataTable,
  EmptyState,
  ErrorState,
  inputClass,
  Meter,
  Section,
  StatusPill,
} from './ui'

const CATALOG_KEY = ['admin', 'catalog']

type Tab = 'imageTypes' | 'rules'

function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không đọc được tệp.'))
    reader.readAsText(file)
  })
}

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function CatalogPage() {
  const request = useAdminRequest()
  const catalog = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: () => request<Catalog>('/recognition/catalog'),
  })
  const [tab, setTab] = useState<Tab>('imageTypes')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | ItemStatus>('')
  const [categoryId, setCategoryId] = useState('')
  const [editing, setEditing] = useState<
    { type: 'image'; key: string } | { type: 'rule'; id: string } | null
  >(null)
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const header = (
    <PageHeader
      eyebrow="Nhận diện chi tiêu"
      title="Catalog"
      description="Loại ảnh gửi cho mô hình và quy tắc mặc định chuyển loại ảnh thành danh mục. Instance khác nhận thay đổi trong vòng 60 giây."
      actions={
        catalog.data ? (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                download(
                  `billet-catalog-${new Date().toISOString().slice(0, 10)}.json`,
                  'application/json',
                  JSON.stringify(exportCatalog(catalog.data), null, 2),
                )
              }
            >
              <Download className="size-4" aria-hidden /> Xuất JSON
            </Button>
            <label
              className={buttonClass(
                'secondary',
                'md',
                'cursor-pointer focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-3 focus-within:outline-coral',
              )}
            >
              <Upload className="size-4" aria-hidden /> Nhập JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Nhập catalog từ tệp JSON"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  setImportError(null)
                  void readText(file)
                    .then((text) => setImportPlan(planImport(catalog.data, parseImport(text))))
                    .catch((error: unknown) =>
                      setImportError(
                        error instanceof Error ? error.message : 'Không đọc được tệp.',
                      ),
                    )
                }}
              />
            </label>
          </>
        ) : null
      }
    />
  )
  if (catalog.isPending)
    return (
      <>
        {header}
        <div role="status" aria-label="Đang tải" className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  if (catalog.isError)
    return (
      <>
        {header}
        <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
      </>
    )

  const { imageTypes, defaultRules, categories } = catalog.data
  const needle = search.trim().toLowerCase()
  const shownTypes = imageTypes.filter(
    (item) =>
      (!status || item.status === status) &&
      (!needle ||
        `${item.key} ${item.label} ${item.description ?? ''}`.toLowerCase().includes(needle)),
  )
  const shownRules = defaultRules.filter(
    (rule) =>
      (!status || rule.status === status) &&
      (!categoryId || rule.categoryId === categoryId) &&
      (!needle || `${rule.imageType} ${rule.categoryName ?? ''}`.toLowerCase().includes(needle)),
  )
  const editingType =
    editing?.type === 'image' ? imageTypes.find((item) => item.key === editing.key) : undefined
  const editingRule =
    editing?.type === 'rule' ? defaultRules.find((rule) => rule.id === editing.id) : undefined
  const filtered = Boolean(search || status || categoryId)

  const exportCsv = () =>
    tab === 'imageTypes'
      ? download(
          'billet-image-types.csv',
          'text/csv',
          toCsv(
            ['key', 'label', 'description', 'status', 'version'],
            shownTypes.map((item) => [
              item.key,
              item.label,
              item.description ?? '',
              item.status,
              String(item.version),
            ]),
          ),
        )
      : download(
          'billet-default-rules.csv',
          'text/csv',
          toCsv(
            ['image_type', 'category', 'confidence', 'status', 'version'],
            shownRules.map((rule) => [
              rule.imageType,
              rule.categoryName ?? '',
              String(rule.confidence),
              rule.status,
              String(rule.version),
            ]),
          ),
        )

  return (
    <>
      {header}
      {importError ? <ErrorState error={new Error(importError)} /> : null}

      <Section
        title={tab === 'imageTypes' ? 'Loại ảnh' : 'Default rule'}
        description={
          tab === 'imageTypes'
            ? 'Các lựa chọn gửi cho mô hình khi nhận diện ảnh.'
            : 'Loại ảnh dẫn tới danh mục hệ thống khi người dùng chưa có rule riêng.'
        }
        actions={
          <Segmented<Tab>
            label="Bảng"
            value={tab}
            onChange={(next) => {
              setTab(next)
              setCategoryId('')
            }}
            options={[
              { value: 'imageTypes', text: 'Loại ảnh', label: `Loại ảnh (${imageTypes.length})` },
              {
                value: 'rules',
                text: 'Default rule',
                label: `Default rule (${defaultRules.length})`,
              },
            ]}
          />
        }
      >
        <div role="search" className="mb-5 flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-sm font-semibold">
            Tìm kiếm
            <span className="relative mt-1 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                type="search"
                className={`${inputClass} pl-9 font-normal`}
                placeholder={
                  tab === 'imageTypes' ? 'Khóa, nhãn hoặc mô tả' : 'Loại ảnh hoặc danh mục'
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>
          <label className="w-40 text-sm font-semibold">
            Trạng thái
            <select
              className={`${inputClass} mt-1 font-normal`}
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | ItemStatus)}
            >
              <option value="">Tất cả</option>
              <option value="enabled">Đang bật</option>
              <option value="disabled">Đang tắt</option>
            </select>
          </label>
          {tab === 'rules' ? (
            <label className="w-48 text-sm font-semibold">
              Danh mục
              <select
                className={`${inputClass} mt-1 font-normal`}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Tất cả</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setStatus('')
                setCategoryId('')
              }}
            >
              Xóa lọc
            </Button>
          ) : null}
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="size-4" aria-hidden /> Xuất CSV
          </Button>
        </div>
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {tab === 'imageTypes'
            ? `${shownTypes.length}/${imageTypes.length} loại ảnh`
            : `${shownRules.length}/${defaultRules.length} rule`}
        </p>

        {tab === 'imageTypes' ? (
          shownTypes.length === 0 ? (
            <EmptyState>Không có loại ảnh phù hợp.</EmptyState>
          ) : (
            <DataTable
              caption="Loại ảnh"
              headers={['Khóa', 'Nhãn', 'Mô tả', 'Trạng thái', 'Phiên bản', '']}
            >
              {shownTypes.map((item) => (
                <ImageTypeRow
                  key={`${item.key}:${item.version}`}
                  item={item}
                  onEdit={() => setEditing({ type: 'image', key: item.key })}
                />
              ))}
            </DataTable>
          )
        ) : shownRules.length === 0 ? (
          <EmptyState>
            {defaultRules.length === 0 ? 'Chưa có default rule.' : 'Không có rule phù hợp.'}
          </EmptyState>
        ) : (
          <DataTable
            caption="Default rule"
            headers={['Loại ảnh', 'Danh mục', 'Độ tin cậy', 'Trạng thái', 'Phiên bản', '']}
          >
            {shownRules.map((rule) => (
              <RuleRow
                key={`${rule.id}:${rule.version}`}
                rule={rule}
                onEdit={() => setEditing({ type: 'rule', id: rule.id })}
              />
            ))}
          </DataTable>
        )}
      </Section>

      <Dialog
        open={Boolean(editingType || editingRule)}
        onClose={() => setEditing(null)}
        variant="drawer"
        title={
          editingType
            ? `Sửa loại ảnh ${editingType.key}`
            : `Sửa rule ${editingRule?.imageType ?? ''}`
        }
      >
        {editingType ? (
          <ImageTypeForm item={editingType} onSaved={() => setEditing(null)} />
        ) : editingRule ? (
          <DefaultRuleForm
            rule={editingRule}
            categories={categories}
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

      <ImportDialog plan={importPlan} onClose={() => setImportPlan(null)} />
    </>
  )
}

function ImageTypeRow({ item, onEdit }: { item: ImageType; onEdit(): void }) {
  const update = useCatalogUpdate(`/recognition/image-types/${item.key}`)
  return (
    <tr>
      <Cell>
        <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-xs font-semibold">
          {item.key}
        </span>
      </Cell>
      <Cell>{item.label}</Cell>
      <Cell>
        <span className="block max-w-xs truncate text-muted" title={item.description ?? undefined}>
          {item.description ?? '–'}
        </span>
      </Cell>
      <Cell>
        <StatusBadge status={item.status} />
      </Cell>
      <Cell>{item.version}</Cell>
      <Cell>
        <span className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" aria-label={`Sửa ${item.key}`} onClick={onEdit}>
            <Pencil className="size-4" aria-hidden /> Sửa
          </Button>
          {item.key === 'other' ? (
            <span className="text-xs text-muted">Luôn bật</span>
          ) : (
            <StatusToggle
              status={item.status}
              name={item.key}
              disabled={update.isPending}
              onChange={(next) => update.mutate({ status: next, version: item.version })}
            />
          )}
        </span>
        {update.isError ? (
          <span className="mt-1 block text-xs text-danger">{update.error.message}</span>
        ) : null}
      </Cell>
    </tr>
  )
}

function RuleRow({ rule, onEdit }: { rule: DefaultRule; onEdit(): void }) {
  const update = useCatalogUpdate(`/recognition/default-rules/${rule.id}`)
  return (
    <tr>
      <Cell>
        <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-xs font-semibold">
          {rule.imageType}
        </span>
      </Cell>
      <Cell>{rule.categoryName ?? 'Không xác định'}</Cell>
      <Cell>
        <Meter value={rule.confidence} label={`Độ tin cậy rule ${rule.imageType}`} />
      </Cell>
      <Cell>
        <StatusBadge status={rule.status} />
      </Cell>
      <Cell>{rule.version}</Cell>
      <Cell>
        <span className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Sửa rule ${rule.imageType}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden /> Sửa
          </Button>
          <StatusToggle
            status={rule.status}
            name={rule.imageType}
            disabled={update.isPending}
            onChange={(next) => update.mutate({ status: next, version: rule.version })}
          />
        </span>
        {update.isError ? (
          <span className="mt-1 block text-xs text-danger">{update.error.message}</span>
        ) : null}
      </Cell>
    </tr>
  )
}

/** Shows what an imported file would change, then applies the PATCHes one by one. */
function ImportDialog({ plan, onClose }: { plan: ImportPlan | null; onClose(): void }) {
  const request = useAdminRequest()
  const client = useQueryClient()
  const apply = useMutation({
    mutationFn: async (changes: PlannedChange[]) => {
      const failures: string[] = []
      for (const change of changes)
        try {
          await request(change.path, { method: 'PATCH', json: change.json })
        } catch (error) {
          failures.push(`${change.title}: ${error instanceof Error ? error.message : 'lỗi'}`)
        }
      await client.invalidateQueries({ queryKey: CATALOG_KEY })
      return { failures, total: changes.length }
    },
  })
  const close = () => {
    apply.reset()
    onClose()
  }
  const result = apply.data
  return (
    <Dialog
      open={plan !== null}
      onClose={close}
      title="Nhập catalog"
      description={result ? undefined : 'Xem lại các thay đổi trước khi áp dụng.'}
      footer={
        result ? (
          <Button onClick={close}>Đóng</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Hủy
            </Button>
            <Button
              disabled={!plan || plan.changes.length === 0}
              loading={apply.isPending}
              onClick={() => plan && apply.mutate(plan.changes)}
            >
              Áp dụng {plan?.changes.length ?? 0} thay đổi
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div role="status" className="space-y-3 text-sm">
          <p className="font-semibold">
            Đã áp dụng {result.total - result.failures.length}/{result.total} thay đổi.
          </p>
          {result.failures.length > 0 ? (
            <ErrorState error={new Error(result.failures.join('\n'))} />
          ) : null}
        </div>
      ) : plan ? (
        <div className="space-y-4">
          {plan.changes.length === 0 ? (
            <EmptyState>Tệp khớp với catalog hiện tại, không có gì để thay đổi.</EmptyState>
          ) : (
            <ul className="divide-y divide-line/70 rounded-xl border border-line">
              {plan.changes.map((change) => (
                <li key={change.path} className="px-4 py-3 text-sm">
                  <p className="font-bold">{change.title}</p>
                  <p className="text-muted">{change.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {plan.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-xl bg-honey-soft px-4 py-3 text-sm text-[#7a5a05]">
              {plan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}

/** PATCH a catalog item; a version conflict reloads the catalog instead of overwriting. */
function useCatalogUpdate(path: string) {
  const request = useAdminRequest()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (json: Record<string, unknown>) =>
      request<unknown>(path, { method: 'PATCH', json }),
    onSuccess: () => client.invalidateQueries({ queryKey: CATALOG_KEY }),
    onError: (error) => {
      if (error instanceof AdminApiError && error.status === 409)
        void client.invalidateQueries({ queryKey: CATALOG_KEY })
    },
  })
}

function ImageTypeForm({ item, onSaved }: { item: ImageType; onSaved(): void }) {
  const [label, setLabel] = useState(item.label)
  const [description, setDescription] = useState(item.description ?? '')
  const update = useCatalogUpdate(`/recognition/image-types/${item.key}`)
  const dirty = label !== item.label || description !== (item.description ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(
      { label, description: description.trim() || null, version: item.version },
      { onSuccess: onSaved },
    )
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="w-fit rounded-md bg-sunken px-2 py-0.5 font-mono text-sm font-semibold">
        {item.key}
      </p>
      <label className="block text-sm font-semibold">
        Nhãn
        <input
          className={`${inputClass} mt-1 font-normal`}
          value={label}
          required
          maxLength={80}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Mô tả dấu hiệu nhận biết
        <textarea
          className={`${inputClass} mt-1 h-auto py-2 font-normal`}
          rows={3}
          maxLength={240}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {update.isError ? <ErrorState error={update.error} /> : null}
      <div>
        <Button type="submit" disabled={!dirty} loading={update.isPending}>
          Lưu
        </Button>
      </div>
    </form>
  )
}

function DefaultRuleForm({
  rule,
  categories,
  onSaved,
}: {
  rule: DefaultRule
  categories: Catalog['categories']
  onSaved(): void
}) {
  const [categoryId, setCategoryId] = useState(rule.categoryId ?? '')
  const update = useCatalogUpdate(`/recognition/default-rules/${rule.id}`)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate({ categoryId, version: rule.version }, { onSuccess: onSaved })
  }
  return (
    <form
      onSubmit={submit}
      className="flex h-full flex-col rounded-xl border border-line bg-paper/40 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-md bg-sunken px-2 py-0.5 font-mono text-sm font-semibold">
          {rule.imageType}
        </p>
        <StatusBadge status={rule.status} />
      </div>
      <div className="mt-3 text-sm">
        <p className="mb-1 font-semibold">Độ tin cậy của rule</p>
        <Meter value={rule.confidence} label="Độ tin cậy của rule" />
      </div>
      <label className="mt-3 block text-sm font-semibold">
        Danh mục
        <select
          className={`${inputClass} mt-1 font-normal`}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {categories.every((category) => category.id !== rule.categoryId) ? (
            <option value={rule.categoryId ?? ''} disabled>
              {rule.categoryName ?? 'Không xác định'}
            </option>
          ) : null}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      {update.isError ? (
        <div className="mt-2">
          <ErrorState error={update.error} />
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button
          type="submit"
          disabled={categoryId === (rule.categoryId ?? '')}
          loading={update.isPending}
        >
          Lưu
        </Button>
      </div>
    </form>
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <StatusPill tone={status === 'enabled' ? 'good' : 'muted'}>
      {status === 'enabled' ? 'Đang bật' : 'Đang tắt'}
    </StatusPill>
  )
}

/** Turning an item on applies directly; turning it off asks for confirmation first. */
function StatusToggle({
  status,
  name,
  disabled,
  onChange,
}: {
  status: ItemStatus
  name: string
  disabled: boolean
  onChange(status: ItemStatus): void
}) {
  const [confirming, setConfirming] = useState(false)
  if (status === 'disabled')
    return (
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange('enabled')}
        aria-label={`Bật ${name}`}
      >
        Bật
      </Button>
    )
  if (!confirming)
    return (
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        aria-label={`Tắt ${name}`}
      >
        Tắt
      </Button>
    )
  return (
    <>
      <Button
        variant="danger"
        disabled={disabled}
        onClick={() => {
          setConfirming(false)
          onChange('disabled')
        }}
      >
        Xác nhận tắt {name}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Hủy
      </Button>
    </>
  )
}
