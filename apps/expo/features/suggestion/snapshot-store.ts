import { parseSnapshot } from './contract'
import type { SuggestionSnapshot } from './types'

// Per-user cache of `GET /suggestion-config`. The snapshot is loaded when the app opens or the user
// logs in and revalidated with its ETag; it is cleared on logout so accounts never share it.

export type SnapshotStorage = {
  read(userId: string): Promise<string | null>
  write(userId: string, value: string): Promise<void>
  /** Removes every cached snapshot, whichever user it belongs to. */
  clearAll(): Promise<void>
}

export type SnapshotFetchResult =
  | { status: 'not_modified' }
  | { status: 'ok'; snapshot: SuggestionSnapshot }

export type SnapshotFetcher = (etag: string | null) => Promise<SnapshotFetchResult>

export type SnapshotState = { userId: string | null; snapshot: SuggestionSnapshot | null }

export type SnapshotStore = {
  get(): SnapshotState
  subscribe(listener: () => void): () => void
  /** Reads the cache for the user, then revalidates it. Network errors keep the cached copy. */
  load(userId: string, fetcher: SnapshotFetcher): Promise<void>
  clear(): Promise<void>
}

export function createSnapshotStore(storage: SnapshotStorage): SnapshotStore {
  let state: SnapshotState = { userId: null, snapshot: null }
  const listeners = new Set<() => void>()
  const set = (next: SnapshotState) => {
    state = next
    for (const listener of listeners) listener()
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async load(userId, fetcher) {
      if (state.userId !== userId) {
        set({ userId, snapshot: null })
        const cached = await storage.read(userId).catch(() => null)
        if (state.userId !== userId) return
        if (cached) {
          let parsed: unknown = null
          try {
            parsed = JSON.parse(cached)
          } catch {
            parsed = null
          }
          const snapshot = parseSnapshot(parsed)
          if (snapshot) set({ userId, snapshot })
        }
      }
      try {
        const result = await fetcher(state.snapshot?.etag ?? null)
        if (state.userId !== userId || result.status === 'not_modified') return
        set({ userId, snapshot: result.snapshot })
        await storage.write(userId, JSON.stringify(result.snapshot)).catch(() => undefined)
      } catch {
        // Offline or server error: keep whatever is cached; suggestions stay optional.
      }
    },
    async clear() {
      set({ userId: null, snapshot: null })
      await storage.clearAll().catch(() => undefined)
    },
  }
}
