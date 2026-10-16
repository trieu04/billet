import type { ImageSourcePropType } from 'react-native'

import { API_BASE_URL } from './client'

export function mediaContentSource(mediaAssetId: string, token: string): ImageSourcePropType {
  return {
    uri: `${API_BASE_URL}/media/${mediaAssetId}/content`,
    headers: { Authorization: `Bearer ${token}` },
  }
}
