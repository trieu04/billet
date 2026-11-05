import { describe, expect, it } from 'vitest'
import { exportCatalog, parseImport, planImport, toCsv } from './catalog-transfer'
import type { Catalog } from './types'

const CATALOG: Catalog = {
  imageTypes: [
    { key: 'receipt', label: 'Hóa đơn', description: null, status: 'enabled', version: 3 },
    { key: 'other', label: 'Khác', description: null, status: 'enabled', version: 1 },
  ],
  defaultRules: [
    {
      id: '7',
      imageType: 'receipt',
      categoryId: '5',
      categoryName: 'Ăn uống',
      status: 'enabled',
      confidence: 0.8,
      version: 2,
    },
  ],
  categories: [
    { id: '5', code: 'food', name: 'Ăn uống' },
    { id: '6', code: 'shopping', name: 'Mua sắm' },
  ],
  thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
  decisionImage: { maxEdgePx: 1024, quality: 0.6, retryQuality: 0.45, targetBytes: 1, maxBytes: 2 },
}

describe('catalog transfer', () => {
  it('round-trips an export with no changes', () => {
    const file = parseImport(JSON.stringify(exportCatalog(CATALOG)))
    expect(planImport(CATALOG, file)).toEqual({ changes: [], warnings: [] })
  })

  it('plans only the differences, using current versions and category ids', () => {
    const file = exportCatalog(CATALOG)
    file.imageTypes[0].label = 'Biên lai'
    file.defaultRules[0].categoryCode = 'shopping'
    const { changes } = planImport(CATALOG, parseImport(JSON.stringify(file)))
    expect(changes).toEqual([
      expect.objectContaining({
        path: '/recognition/image-types/receipt',
        json: { label: 'Biên lai', version: 3 },
      }),
      expect.objectContaining({
        path: '/recognition/default-rules/7',
        json: { categoryId: '6', version: 2 },
      }),
    ])
  })

  it('never disables the fallback type and skips unknown entries', () => {
    const file = exportCatalog(CATALOG)
    file.imageTypes[1].status = 'disabled'
    file.imageTypes.push({ key: 'ghost', label: 'Ma', description: null, status: 'enabled' })
    const plan = planImport(CATALOG, parseImport(JSON.stringify(file)))
    expect(plan.changes).toEqual([])
    expect(plan.warnings).toHaveLength(2)
  })

  it('rejects files that are not catalog exports', () => {
    expect(() => parseImport('nope')).toThrow('JSON')
    expect(() => parseImport('{"format":"x"}')).toThrow('không phải tệp catalog')
  })

  it('escapes CSV fields', () => {
    expect(toCsv(['a'], [['x"y,z']])).toBe('"a"\r\n"x""y,z"')
  })
})
