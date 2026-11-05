import type { Catalog, ItemStatus } from './types'

export const TRANSFER_FORMAT = 'billet.recognition-catalog'
const FALLBACK_KEY = 'other'

export type CatalogExport = {
  format: typeof TRANSFER_FORMAT
  version: 1
  exportedAt: string
  imageTypes: { key: string; label: string; description: string | null; status: ItemStatus }[]
  defaultRules: { imageType: string; categoryCode: string | null; status: ItemStatus }[]
}

export type PlannedChange = {
  path: string
  json: Record<string, unknown>
  title: string
  detail: string
}

export type ImportPlan = { changes: PlannedChange[]; warnings: string[] }

/** Portable snapshot: rules refer to categories by code because ids differ between environments. */
export function exportCatalog(catalog: Catalog, now = new Date()): CatalogExport {
  const codeById = new Map(catalog.categories.map((category) => [category.id, category.code]))
  return {
    format: TRANSFER_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    imageTypes: catalog.imageTypes.map(({ key, label, description, status }) => ({
      key,
      label,
      description,
      status,
    })),
    defaultRules: catalog.defaultRules.map((rule) => ({
      imageType: rule.imageType,
      categoryCode: rule.categoryId ? (codeById.get(rule.categoryId) ?? null) : null,
      status: rule.status,
    })),
  }
}

const quote = (value: string) => `"${value.replaceAll('"', '""')}"`

/** Flat CSV of the rows currently on screen, for spreadsheets. */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
}

function isStatus(value: unknown): value is ItemStatus {
  return value === 'enabled' || value === 'disabled'
}

/** Parses an exported file; throws a readable error when it is not one. */
export function parseImport(text: string): CatalogExport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Tệp không phải JSON hợp lệ.')
  }
  const file = data as Partial<CatalogExport> | null
  if (!file || file.format !== TRANSFER_FORMAT || file.version !== 1)
    throw new Error('Đây không phải tệp catalog do Billet xuất ra.')
  if (!Array.isArray(file.imageTypes) || !Array.isArray(file.defaultRules))
    throw new Error('Tệp thiếu danh sách loại ảnh hoặc default rule.')
  for (const item of file.imageTypes)
    if (
      typeof item?.key !== 'string' ||
      typeof item.label !== 'string' ||
      item.label.length < 1 ||
      item.label.length > 80 ||
      (item.description !== null && typeof item.description !== 'string') ||
      (typeof item.description === 'string' && item.description.length > 240) ||
      !isStatus(item.status)
    )
      throw new Error(`Loại ảnh không hợp lệ: ${String(item?.key)}`)
  for (const rule of file.defaultRules)
    if (
      typeof rule?.imageType !== 'string' ||
      (rule.categoryCode !== null && typeof rule.categoryCode !== 'string') ||
      !isStatus(rule.status)
    )
      throw new Error(`Default rule không hợp lệ: ${String(rule?.imageType)}`)
  return file as CatalogExport
}

/** Compares a file with the live catalog and lists the PATCH requests that would reconcile them. */
export function planImport(catalog: Catalog, file: CatalogExport): ImportPlan {
  const changes: PlannedChange[] = []
  const warnings: string[] = []
  const idByCode = new Map(catalog.categories.map((category) => [category.code, category.id]))

  for (const item of file.imageTypes) {
    const current = catalog.imageTypes.find((entry) => entry.key === item.key)
    if (!current) {
      warnings.push(`Bỏ qua loại ảnh “${item.key}”: chưa có trong hệ thống.`)
      continue
    }
    const json: Record<string, unknown> = {}
    const parts: string[] = []
    if (item.label !== current.label) {
      json.label = item.label
      parts.push(`nhãn “${current.label}” → “${item.label}”`)
    }
    if (item.description !== current.description) {
      json.description = item.description
      parts.push('mô tả')
    }
    if (item.status !== current.status) {
      if (item.key === FALLBACK_KEY && item.status === 'disabled') {
        warnings.push(`Giữ “${FALLBACK_KEY}” luôn bật vì là lựa chọn dự phòng.`)
      } else {
        json.status = item.status
        parts.push(`trạng thái → ${item.status === 'enabled' ? 'bật' : 'tắt'}`)
      }
    }
    if (parts.length > 0)
      changes.push({
        path: `/recognition/image-types/${item.key}`,
        json: { ...json, version: current.version },
        title: `Loại ảnh ${item.key}`,
        detail: parts.join(', '),
      })
  }

  for (const rule of file.defaultRules) {
    const current = catalog.defaultRules.find((entry) => entry.imageType === rule.imageType)
    if (!current) {
      warnings.push(`Bỏ qua rule “${rule.imageType}”: chưa có trong hệ thống.`)
      continue
    }
    const json: Record<string, unknown> = {}
    const parts: string[] = []
    if (rule.categoryCode) {
      const categoryId = idByCode.get(rule.categoryCode)
      if (!categoryId) {
        warnings.push(`Bỏ qua danh mục “${rule.categoryCode}” của rule “${rule.imageType}”.`)
      } else if (categoryId !== current.categoryId) {
        json.categoryId = categoryId
        parts.push(`danh mục → ${rule.categoryCode}`)
      }
    }
    if (rule.status !== current.status) {
      json.status = rule.status
      parts.push(`trạng thái → ${rule.status === 'enabled' ? 'bật' : 'tắt'}`)
    }
    if (parts.length > 0)
      changes.push({
        path: `/recognition/default-rules/${current.id}`,
        json: { ...json, version: current.version },
        title: `Rule ${rule.imageType}`,
        detail: parts.join(', '),
      })
  }
  return { changes, warnings }
}
