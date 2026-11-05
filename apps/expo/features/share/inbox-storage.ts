import * as FileSystem from 'expo-file-system/legacy'

import { isExpired, parseManifest, type ShareManifest, type SharedImage } from './share-model'

const root = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}share-inbox/` : null
const manifestUri = root ? `${root}manifest.json` : null

async function ensureRoot(): Promise<string> {
  if (!root) throw new Error('Share inbox is unavailable on this platform')
  await FileSystem.makeDirectoryAsync(root, { intermediates: true })
  return root
}

async function readManifest(): Promise<ShareManifest | null> {
  if (!manifestUri || !(await FileSystem.getInfoAsync(manifestUri)).exists) return null
  try {
    return parseManifest(JSON.parse(await FileSystem.readAsStringAsync(manifestUri)))
  } catch {
    return null
  }
}

async function deleteUri(uri: string | null): Promise<void> {
  if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}

export async function loadSharedImage(now = Date.now()): Promise<SharedImage | null> {
  const directory = await ensureRoot()
  const manifest = await readManifest()
  if (!manifest || isExpired(manifest.receivedAt, now)) {
    await clearShareInbox()
    return null
  }
  const uri = `${directory}${manifest.fileName}`
  if (!(await FileSystem.getInfoAsync(uri)).exists) {
    await clearShareInbox()
    return null
  }
  await cleanupOrphans(manifest.fileName)
  return { id: manifest.id, uri, receivedAt: manifest.receivedAt }
}

export async function storeSharedImage(input: {
  id: string
  normalizedUri: string
  receivedAt: string
}): Promise<SharedImage> {
  const directory = await ensureRoot()
  const fileName = `${input.id}.jpg`
  const fileUri = `${directory}${fileName}`
  const fileTempUri = `${directory}${input.id}.tmp`
  await deleteUri(fileTempUri)
  await FileSystem.copyAsync({ from: input.normalizedUri, to: fileTempUri })
  await FileSystem.moveAsync({ from: fileTempUri, to: fileUri })
  await writeManifest(directory, { id: input.id, fileName, receivedAt: input.receivedAt })
  return { id: input.id, uri: fileUri, receivedAt: input.receivedAt }
}

async function writeManifest(directory: string, manifest: ShareManifest): Promise<void> {
  if (!manifestUri) throw new Error('Share inbox is unavailable on this platform')
  const manifestTempUri = `${directory}manifest.tmp`
  await FileSystem.writeAsStringAsync(manifestTempUri, JSON.stringify(manifest))
  await deleteUri(manifestUri)
  await FileSystem.moveAsync({ from: manifestTempUri, to: manifestUri })
}

/** Points the slot back at an image still under review after a newer one was declined. */
export async function restoreStoredImage(image: SharedImage): Promise<void> {
  await writeManifest(await ensureRoot(), {
    id: image.id,
    fileName: `${image.id}.jpg`,
    receivedAt: image.receivedAt,
  })
}

export async function completeStoredImage(id: string): Promise<void> {
  const directory = await ensureRoot()
  const manifest = await readManifest()
  await deleteUri(`${directory}${id}.jpg`)
  if (manifest?.id === id) await deleteUri(manifestUri)
}

export async function clearShareInbox(): Promise<void> {
  if (!root) return
  await FileSystem.deleteAsync(root, { idempotent: true }).catch(() => undefined)
  await FileSystem.makeDirectoryAsync(root, { intermediates: true })
}

async function cleanupOrphans(keepFileName: string): Promise<void> {
  const directory = await ensureRoot()
  const entries = await FileSystem.readDirectoryAsync(directory)
  await Promise.all(
    entries
      .filter((entry) => entry !== keepFileName && entry !== 'manifest.json')
      .map((entry) => deleteUri(`${directory}${entry}`)),
  )
}
