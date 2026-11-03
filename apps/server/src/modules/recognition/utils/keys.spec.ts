import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { encodeGeohash, isPlaceKey, normalizeMerchantKey, toMerchantKey } from './keys'

interface Vectors {
  geohash: { latitude: number; longitude: number; precision: number; expected: string }[]
  merchantKey: { input: string; expected: string }[]
}

// Read the client's vectors directly so both apps are checked against one source of truth.
const vectors = JSON.parse(
  readFileSync(
    join(__dirname, '../../../../../expo/features/suggestion/test-vectors.json'),
    'utf8',
  ),
) as Vectors

describe('suggestion keys (shared vectors)', () => {
  it.each(vectors.geohash)(
    'encodes $latitude,$longitude at precision $precision',
    ({ latitude, longitude, precision, expected }) => {
      expect(encodeGeohash(latitude, longitude, precision)).toBe(expected)
    },
  )

  it.each(vectors.merchantKey)('normalizes merchant "$input"', ({ input, expected }) => {
    expect(normalizeMerchantKey(input)).toBe(expected)
    expect(toMerchantKey(input)).toBe(expected || null)
  })

  it('accepts only 7-character geohashes as place keys', () => {
    expect(isPlaceKey('w3gvk1c')).toBe(true)
    expect(isPlaceKey('w3gvk1')).toBe(false)
    expect(isPlaceKey('W3GVK1C')).toBe(false)
    expect(isPlaceKey('w3gvk1a')).toBe(false) // `a` is not in the geohash alphabet
    expect(isPlaceKey(null)).toBe(false)
  })
})
