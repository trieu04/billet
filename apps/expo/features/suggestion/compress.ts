import * as FileSystem from 'expo-file-system/legacy'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'

import { encodeWithinBudget, longEdgeResize } from './compress-policy'
import type { CompressedImage } from './session'
import type { DecisionImageConfig } from './types'

// Small JPEG used only for the Decision request. Re-encoding drops EXIF metadata (including GPS);
// the original photo is untouched and is uploaded separately when the expense is saved.

export async function compressForDecision(
  uri: string,
  config: DecisionImageConfig,
): Promise<CompressedImage | null> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync()
    const resize = longEdgeResize(original.width, original.height, config.maxEdgePx)
    const image = resize
      ? await ImageManipulator.manipulate(original).resize(resize).renderAsync()
      : original
    try {
      return await encodeWithinBudget(
        config,
        async (quality) => {
          const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG })
          return { uri: result.uri, bytes: await byteSize(result.uri) }
        },
        discardImageFile,
      )
    } finally {
      if (image !== original) image.release()
      original.release()
    }
  } catch {
    return null
  }
}

/** Deletes a temporary encoded image; a no-op on web, where it is an object URL. */
export async function discardImageFile(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri)
    return
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}

async function byteSize(uri: string): Promise<number> {
  if (Platform.OS !== 'web') {
    const info = await FileSystem.getInfoAsync(uri)
    return info.exists ? info.size : 0
  }
  const response = await fetch(uri)
  return (await response.blob()).size
}
