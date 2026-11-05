import { Paths } from 'expo-file-system'
import * as FileSystem from 'expo-file-system/legacy'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'

const MAX_LONG_EDGE = 3_000

export async function normalizeSharedImage(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync()
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(original.width, original.height))
  const resized =
    scale < 1
      ? await ImageManipulator.manipulate(original)
          .resize({
            width: Math.round(original.width * scale),
            height: Math.round(original.height * scale),
          })
          .renderAsync()
      : original
  try {
    return (await resized.saveAsync({ compress: 0.9, format: SaveFormat.JPEG })).uri
  } finally {
    if (resized !== original) resized.release()
    original.release()
  }
}

const canonical = (uri: string) => uri.replace('file:///private/', 'file:///')

/**
 * Deletes the adapter's copy of a shared file. Android can report the user's original file in
 * external storage, so only the cache and the App Group, which hold the adapter's copies, qualify.
 */
export async function discardAdapterFile(path: string | null | undefined): Promise<void> {
  if (!path) return
  const owned = [
    FileSystem.cacheDirectory,
    ...Object.values(Paths.appleSharedContainers).map((container) => container.uri),
  ]
  if (!owned.some((root) => root && canonical(path).startsWith(canonical(root)))) return
  await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined)
}

export async function discardNormalizedImage(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri)
    return
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}
