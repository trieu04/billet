import { describe, expect, it, vi } from 'vitest'
import { encodeWithinBudget, longEdgeResize } from './compress-policy'
import type { DecisionImageConfig } from './types'

const config: DecisionImageConfig = {
  maxEdgePx: 1024,
  quality: 0.6,
  retryQuality: 0.45,
  targetBytes: 150_000,
  maxBytes: 400_000,
}

describe('longEdgeResize', () => {
  it('resizes the long edge only when it exceeds the limit', () => {
    expect(longEdgeResize(4032, 3024, 1024)).toEqual({ width: 1024 })
    expect(longEdgeResize(3024, 4032, 1024)).toEqual({ height: 1024 })
    expect(longEdgeResize(1024, 768, 1024)).toBeNull()
    expect(longEdgeResize(0, 0, 1024)).toBeNull()
  })
})

describe('encodeWithinBudget', () => {
  it('keeps the first encoding when it fits', async () => {
    const encode = vi.fn(async () => ({ uri: 'a.jpg', bytes: 150_000 }))
    await expect(encodeWithinBudget(config, encode)).resolves.toEqual({
      uri: 'a.jpg',
      bytes: 150_000,
      mimeType: 'image/jpeg',
    })
    expect(encode).toHaveBeenCalledWith(0.6)
    expect(encode).toHaveBeenCalledTimes(1)
  })

  it('retries once at the lower quality and discards the oversized file', async () => {
    const encode = vi.fn(async (quality: number) =>
      quality === 0.6 ? { uri: 'big.jpg', bytes: 500_000 } : { uri: 'ok.jpg', bytes: 300_000 },
    )
    const discard = vi.fn(async () => undefined)
    await expect(encodeWithinBudget(config, encode, discard)).resolves.toMatchObject({
      uri: 'ok.jpg',
    })
    expect(encode.mock.calls).toEqual([[0.6], [0.45]])
    expect(discard).toHaveBeenCalledWith('big.jpg')
  })

  it('gives up when the retry is still too large', async () => {
    const discard = vi.fn(async () => undefined)
    const result = await encodeWithinBudget(
      config,
      async (quality) => ({ uri: `${quality}.jpg`, bytes: 401_000 }),
      discard,
    )
    expect(result).toBeNull()
    expect(discard).toHaveBeenCalledTimes(2)
  })
})
