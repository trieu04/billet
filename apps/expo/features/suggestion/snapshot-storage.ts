import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

import type { SnapshotStorage } from './snapshot-store'

// Snapshot cache location: one JSON file per user in the app's document directory on native, and
// prefixed localStorage keys on web. `clearAll` runs on logout.

const WEB_PREFIX = 'billet.suggestion-config.'
const DIRECTORY = `${FileSystem.documentDirectory ?? ''}suggestion-config/`

function fileFor(userId: string) {
  return `${DIRECTORY}${encodeURIComponent(userId)}.json`
}

function webStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const snapshotStorage: SnapshotStorage = {
  async read(userId) {
    if (Platform.OS === 'web') return webStorage()?.getItem(WEB_PREFIX + userId) ?? null
    const uri = fileFor(userId)
    if (!(await FileSystem.getInfoAsync(uri)).exists) return null
    return FileSystem.readAsStringAsync(uri)
  },
  async write(userId, value) {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(WEB_PREFIX + userId, value)
      return
    }
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true }).catch(() => undefined)
    await FileSystem.writeAsStringAsync(fileFor(userId), value)
  },
  async clearAll() {
    if (Platform.OS === 'web') {
      const storage = webStorage()
      if (!storage) return
      const keys: string[] = []
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key?.startsWith(WEB_PREFIX)) keys.push(key)
      }
      for (const key of keys) storage.removeItem(key)
      return
    }
    await FileSystem.deleteAsync(DIRECTORY, { idempotent: true })
  },
}
