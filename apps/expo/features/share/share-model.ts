export const SHARE_INBOX_TTL_MS = 24 * 60 * 60 * 1_000

export type SharedImage = { id: string; uri: string; receivedAt: string }
export type ShareManifest = { id: string; fileName: string; receivedAt: string }
export type ShareIntakeErrorCode = 'unsupported' | 'decode' | 'storage' | 'adapter'
export type ShareIntakeError = { code: ShareIntakeErrorCode; message: string }
export type SharedFile = { path: string; mimeType: string }
export type DraftState = 'idle' | 'clean' | 'dirty' | 'saving'
export type ArrivalDecision = 'open' | 'replace' | 'ask' | 'defer'

export function classifyPayload(
  files: readonly SharedFile[] | null | undefined,
): { ok: true; file: SharedFile } | { ok: false; error: ShareIntakeError } {
  if (files?.length !== 1 || !files[0]?.mimeType.toLowerCase().startsWith('image/')) {
    return {
      ok: false,
      error: { code: 'unsupported', message: 'Billet hiện chỉ nhận một ảnh.' },
    }
  }
  return { ok: true, file: files[0] }
}

export function isExpired(receivedAt: string, now = Date.now()): boolean {
  const timestamp = Date.parse(receivedAt)
  return !Number.isFinite(timestamp) || now - timestamp >= SHARE_INBOX_TTL_MS
}

export function parseManifest(value: unknown): ShareManifest | null {
  if (!value || typeof value !== 'object') return null
  const manifest = value as Partial<ShareManifest>
  if (
    typeof manifest.id !== 'string' ||
    !/^[a-zA-Z0-9-]+$/.test(manifest.id) ||
    typeof manifest.fileName !== 'string' ||
    manifest.fileName !== `${manifest.id}.jpg` ||
    typeof manifest.receivedAt !== 'string' ||
    !Number.isFinite(Date.parse(manifest.receivedAt))
  ) {
    return null
  }
  return { id: manifest.id, fileName: manifest.fileName, receivedAt: manifest.receivedAt }
}

export function decideArrival(state: {
  draft: DraftState
  reviewActive: boolean
}): ArrivalDecision {
  if (state.draft === 'saving') return 'defer'
  if (!state.reviewActive || state.draft === 'idle') return 'open'
  if (state.draft === 'dirty') return 'ask'
  return 'replace'
}
