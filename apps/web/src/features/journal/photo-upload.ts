import type { RequestOptions } from '@/lib/api-client'

const MAX_EDGE_PX = 1600
const JPEG_QUALITY = 0.82

type Api = <T>(path: string, options?: RequestOptions) => Promise<T>

/** Scales a photo down to a web-friendly JPEG so uploads stay small on mobile connections. */
export async function preparePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Không xử lý được ảnh này.'))),
        'image/jpeg',
        JPEG_QUALITY,
      ),
    )
  } finally {
    bitmap.close()
  }
}

/** Reserves a media asset, uploads the bytes, and returns the asset id. */
export async function uploadPhoto(api: Api, photo: Blob): Promise<string> {
  const reserved = await api<{ id: string }>('/media', {
    method: 'POST',
    json: { mimeType: photo.type, sizeBytes: photo.size },
  })
  await api(`/media/${reserved.id}/content`, {
    method: 'PUT',
    body: photo,
    headers: { 'Content-Type': photo.type },
  })
  return reserved.id
}
