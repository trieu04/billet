import type { DecisionImage } from './types'

/** Target size that fits within `maxEdge` while keeping the ratio; never upscales. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Compress like the mobile client: resize to the longest edge, encode as JPEG, and retry at the
 * lower quality when the result is above the target. Fails when it stays above the maximum.
 */
export async function compressForDecision(file: Blob, config: DecisionImage): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const size = fitWithin(bitmap.width, bitmap.height, config.maxEdgePx)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không hỗ trợ nén ảnh.')
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    let blob = await encode(canvas, config.quality)
    if (blob.size > config.targetBytes) blob = await encode(canvas, config.retryQuality)
    if (blob.size > config.maxBytes) throw new Error('Ảnh vẫn quá lớn sau khi nén.')
    return blob
  } finally {
    bitmap.close()
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh này.'))),
      'image/jpeg',
      quality,
    )
  })
}
