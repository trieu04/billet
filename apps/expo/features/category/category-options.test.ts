import { describe, expect, it } from 'vitest'
import { categoryColors, categoryIcon, categoryIcons } from './category-options'

describe('category options', () => {
  it('keeps the editor varied and falls back safely for legacy icons', () => {
    expect(new Set(categoryColors).size).toBeGreaterThanOrEqual(8)
    expect(new Set(categoryIcons).size).toBe(categoryIcons.length)
    expect(categoryIcon('coffee')).toBe('coffee')
    expect(categoryIcon('legacy-unknown-icon')).toBe('grid')
  })
})
