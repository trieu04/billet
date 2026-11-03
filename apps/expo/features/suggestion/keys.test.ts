import { describe, expect, it } from 'vitest'
import vectors from './test-vectors.json'
import {
  encodeGeohash,
  normalizeMerchantKey,
  stripDiacritics,
  toMerchantKey,
  toPlaceKey,
} from './keys'

describe('encodeGeohash', () => {
  it.each(vectors.geohash)(
    'encodes $latitude,$longitude at precision $precision',
    ({ latitude, longitude, precision, expected }) => {
      expect(encodeGeohash(latitude, longitude, precision)).toBe(expected)
    },
  )

  it('defaults to precision 7', () => {
    expect(encodeGeohash(21.0285, 105.8542)).toHaveLength(7)
  })

  it('rejects invalid input', () => {
    expect(() => encodeGeohash(91, 0)).toThrow(RangeError)
    expect(() => encodeGeohash(0, 181)).toThrow(RangeError)
    expect(() => encodeGeohash(Number.NaN, 0)).toThrow(RangeError)
    expect(() => encodeGeohash(0, 0, 0)).toThrow(RangeError)
  })
})

describe('toPlaceKey', () => {
  it('returns a 7 character key or null', () => {
    expect(toPlaceKey(10.7769, 106.7009)).toBe('w3gvk1c')
    expect(toPlaceKey(Number.NaN, 106)).toBeNull()
    expect(toPlaceKey(10, 200)).toBeNull()
  })
})

describe('normalizeMerchantKey', () => {
  it.each(vectors.merchantKey)('normalizes "$input"', ({ input, expected }) => {
    expect(normalizeMerchantKey(input)).toBe(expected)
  })

  it('treats composed and decomposed input the same', () => {
    expect(normalizeMerchantKey('Phở'.normalize('NFC'))).toBe(
      normalizeMerchantKey('Phở'.normalize('NFD')),
    )
  })
})

describe('toMerchantKey', () => {
  it('returns null when nothing remains', () => {
    expect(toMerchantKey('***')).toBeNull()
    expect(toMerchantKey(undefined)).toBeNull()
    expect(toMerchantKey('Phở 24')).toBe('pho 24')
  })
})

describe('stripDiacritics', () => {
  it('lowercases and removes Vietnamese marks', () => {
    expect(stripDiacritics('TỔNG CỘNG Đồng')).toBe('tong cong dong')
  })
})
