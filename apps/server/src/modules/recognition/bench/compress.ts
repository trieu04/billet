import sharp from 'sharp'

/**
 * Same parameters as the client encoder: long edge 1024 px, JPEG quality 0.6, no metadata,
 * retry at 0.45 when the result is larger than 400 KB.
 */
export const COMPRESSION = {
  longEdgePx: 1024,
  quality: 60,
  retryQuality: 45,
  retryAboveBytes: 400_000,
} as const

export type ImageCompressor = (bytes: Uint8Array) => Promise<Uint8Array>

export const compressForDecision: ImageCompressor = async (bytes) => {
  const encode = (quality: number) =>
    sharp(bytes)
      // Apply EXIF orientation before the metadata is dropped (sharp strips EXIF by default).
      .rotate()
      .resize({
        width: COMPRESSION.longEdgePx,
        height: COMPRESSION.longEdgePx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer()

  const first = await encode(COMPRESSION.quality)
  if (first.length <= COMPRESSION.retryAboveBytes) return first
  return encode(COMPRESSION.retryQuality)
}
