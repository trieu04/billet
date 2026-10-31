import { describe, expect, it } from 'vitest'
import { pickVariantPerMotif } from './placeholder-selection'

const items = [
  { id: 'a-1', motifId: 'a' },
  { id: 'b-1', motifId: 'b' },
  { id: 'a-2', motifId: 'a' },
  { id: 'b-2', motifId: 'b' },
  { id: 'a-3', motifId: 'a' },
]

describe('pickVariantPerMotif', () => {
  it('returns one item per motif in first-seen order', () => {
    const picked = pickVariantPerMotif(items, () => 0)
    expect(picked.map((item) => item.id)).toEqual(['a-1', 'b-1'])
  })

  it('picks the variant selected by the random source', () => {
    expect(pickVariantPerMotif(items, () => 0.5).map((item) => item.id)).toEqual(['a-2', 'b-2'])
    expect(pickVariantPerMotif(items, () => 0.99).map((item) => item.id)).toEqual(['a-3', 'b-2'])
  })

  it('handles an empty list', () => {
    expect(pickVariantPerMotif([], () => 0)).toEqual([])
  })
})
