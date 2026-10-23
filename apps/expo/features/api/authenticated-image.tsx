import { type ReactNode, useEffect, useState } from 'react'
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  Platform,
  type StyleProp,
} from 'react-native'

import { fetchAuthenticatedMedia, mediaContentUrl } from './media'

type Props = {
  accessibilityLabel: string
  fallback: ReactNode
  mediaAssetId: string
  resizeMode?: ImageResizeMode
  style: StyleProp<ImageStyle>
  token: string
}

export function AuthenticatedImage({
  accessibilityLabel,
  fallback,
  mediaAssetId,
  resizeMode = 'cover',
  style,
  token,
}: Props) {
  const imageKey = `${mediaAssetId}:${token}`
  const [webImage, setWebImage] = useState<{
    failed: boolean
    key: string
    uri: string | null
  } | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') return

    const controller = new AbortController()
    let objectUrl: string | null = null

    void fetchAuthenticatedMedia(mediaAssetId, token, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setWebImage({ failed: false, key: imageKey, uri: objectUrl })
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setWebImage({ failed: true, key: imageKey, uri: null })
        }
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageKey, mediaAssetId, token])

  const webUri = webImage?.key === imageKey && !webImage.failed ? webImage.uri : null
  if (Platform.OS === 'web' && !webUri) return fallback

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode={resizeMode}
      source={
        Platform.OS === 'web'
          ? { uri: webUri! }
          : {
              uri: mediaContentUrl(mediaAssetId),
              headers: { Authorization: `Bearer ${token}` },
            }
      }
      style={style}
    />
  )
}
