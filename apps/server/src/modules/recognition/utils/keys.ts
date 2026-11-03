// Server port of apps/expo/features/suggestion/keys.ts. Both sides must agree byte for byte; the
// shared vectors in apps/expo/features/suggestion/test-vectors.json are the source of truth.

const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz'

export const PLACE_KEY_PRECISION = 7

const PLACE_KEY_PATTERN = new RegExp(`^[${GEOHASH_ALPHABET}]{${PLACE_KEY_PRECISION}}$`)

export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision: number = PLACE_KEY_PRECISION,
): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('latitude must be within [-90, 90]')
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('longitude must be within [-180, 180]')
  }
  if (!Number.isInteger(precision) || precision < 1 || precision > 12) {
    throw new RangeError('precision must be an integer within [1, 12]')
  }

  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180
  let hash = ''
  let bits = 0
  let bitCount = 0
  let evenBit = true // Longitude is encoded first.

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2
      if (longitude >= mid) {
        bits = (bits << 1) | 1
        lngMin = mid
      } else {
        bits <<= 1
        lngMax = mid
      }
    } else {
      const mid = (latMin + latMax) / 2
      if (latitude >= mid) {
        bits = (bits << 1) | 1
        latMin = mid
      } else {
        bits <<= 1
        latMax = mid
      }
    }
    evenBit = !evenBit
    bitCount += 1
    if (bitCount === 5) {
      hash += GEOHASH_ALPHABET[bits]
      bits = 0
      bitCount = 0
    }
  }
  return hash
}

/** True for a 7-character lowercase geohash, the only accepted `placeKey` form. */
export function isPlaceKey(value: unknown): value is string {
  return typeof value === 'string' && PLACE_KEY_PATTERN.test(value)
}

export const PLACE_KEY_REGEX = PLACE_KEY_PATTERN

const COMBINING_MARKS = /\p{M}+/gu

/** Lowercase, Vietnamese diacritics removed (including `đ` to `d`). Keeps punctuation. */
export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').replace(/đ/gi, 'd').toLowerCase()
}

/** Merchant name without diacritics, lowercase, punctuation and whitespace collapsed to one space. */
export function normalizeMerchantKey(name: string): string {
  return stripDiacritics(name)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Same as `normalizeMerchantKey`, but `null` when nothing remains. */
export function toMerchantKey(name: string | null | undefined): string | null {
  if (!name) return null
  return normalizeMerchantKey(name) || null
}
