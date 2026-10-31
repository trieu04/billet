import * as FileSystem from 'expo-file-system/legacy'

import { refreshApiAccessToken } from './client'
import { mediaContentUrl } from './media'

const pendingDownloads = new Map<string, Promise<string>>()

// Native image loaders do not reliably forward request headers, so private
// media is downloaded with the bearer token and rendered from the cache.
export function loadAuthenticatedMediaFile(mediaAssetId: string, token: string) {
  let download = pendingDownloads.get(mediaAssetId)
  if (!download) {
    download = downloadMediaFile(mediaAssetId, token).finally(() => {
      pendingDownloads.delete(mediaAssetId)
    })
    pendingDownloads.set(mediaAssetId, download)
  }
  return download
}

async function downloadMediaFile(mediaAssetId: string, token: string) {
  const uri = `${FileSystem.cacheDirectory}billet-media-${mediaAssetId}`
  if ((await FileSystem.getInfoAsync(uri)).exists) return uri

  const partialUri = `${uri}.download`
  let status = await downloadTo(partialUri, mediaAssetId, token)
  if (status === 401) {
    const refreshedToken = await refreshApiAccessToken()
    if (refreshedToken) status = await downloadTo(partialUri, mediaAssetId, refreshedToken)
  }
  if (status !== 200) {
    await FileSystem.deleteAsync(partialUri, { idempotent: true })
    throw new Error(`Media request failed (${status})`)
  }

  await FileSystem.moveAsync({ from: partialUri, to: uri })
  return uri
}

async function downloadTo(uri: string, mediaAssetId: string, token: string) {
  const result = await FileSystem.downloadAsync(mediaContentUrl(mediaAssetId), uri, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return result.status
}
