import type { CompressedImage } from './session'
import type { DecisionImageConfig } from './types'

// Pure part of the Decision image encoder: which size to resize to and when to give up.

/** Resize so the long edge is at most `maxEdgePx`; `null` when the photo is already small. */
export function longEdgeResize(
  width: number,
  height: number,
  maxEdgePx: number,
): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0) || Math.max(width, height) <= maxEdgePx) return null
  return width >= height ? { width: maxEdgePx } : { height: maxEdgePx }
}

export type EncodedImage = { uri: string; bytes: number }

/**
 * Encode at `quality`; when the result exceeds `maxBytes`, encode once more at `retryQuality`;
 * when that is still too large, give up (`null`) so the photo is not sent. Rejected encodings are
 * passed to `discard` so temporary files do not pile up.
 */
export async function encodeWithinBudget(
  config: DecisionImageConfig,
  encode: (quality: number) => Promise<EncodedImage>,
  discard: (uri: string) => Promise<void> = async () => undefined,
): Promise<CompressedImage | null> {
  for (const quality of [config.quality, config.retryQuality]) {
    const encoded = await encode(quality)
    if (encoded.bytes > 0 && encoded.bytes <= config.maxBytes) {
      return { uri: encoded.uri, bytes: encoded.bytes, mimeType: 'image/jpeg' }
    }
    await discard(encoded.uri).catch(() => undefined)
  }
  return null
}
