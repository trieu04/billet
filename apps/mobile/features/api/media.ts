import { API_BASE_URL } from './client'

export async function fetchAuthenticatedMedia(
  mediaAssetId: string,
  token: string,
  signal?: AbortSignal,
) {
  const response = await fetch(mediaContentUrl(mediaAssetId), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (!response.ok) throw new Error(`Media request failed (${response.status})`)
  return response.blob()
}

export function mediaContentUrl(mediaAssetId: string) {
  return `${API_BASE_URL}/media/${mediaAssetId}/content`
}
