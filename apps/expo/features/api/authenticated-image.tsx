import { type ReactNode, useEffect, useState } from 'react'
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  Platform,
  type StyleProp,
} from 'react-native'

import { fetchAuthenticatedMedia } from './media'
import { loadAuthenticatedMediaFile } from './media-file'

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
  // Native files are cached per asset, so a refreshed token keeps the image shown.
  const imageKey = Platform.OS === 'web' ? `${mediaAssetId}:${token}` : mediaAssetId
  const [image, setImage] = useState<{
    failed: boolean
    key: string
    uri: string | null
  } | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') {
      let active = true
      void loadAuthenticatedMediaFile(mediaAssetId, token)
        .then((uri) => {
          if (active) setImage({ failed: false, key: imageKey, uri })
        })
        .catch(() => {
          if (active) setImage({ failed: true, key: imageKey, uri: null })
        })
      return () => {
        active = false
      }
    }

    const controller = new AbortController()
    let objectUrl: string | null = null

    void fetchAuthenticatedMedia(mediaAssetId, token, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setImage({ failed: false, key: imageKey, uri: objectUrl })
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setImage({ failed: true, key: imageKey, uri: null })
        }
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageKey, mediaAssetId, token])

  const uri = image?.key === imageKey && !image.failed ? image.uri : null
  if (!uri) return fallback

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode={resizeMode}
      source={{ uri }}
      style={style}
    />
  )
}
