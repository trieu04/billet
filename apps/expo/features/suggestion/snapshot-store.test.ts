import { describe, expect, it, vi } from 'vitest'
import { createSnapshotStore } from './snapshot-store'
import type { SnapshotStorage } from './snapshot-store'
import type { SuggestionSnapshot } from './types'

function snapshot(etag: string): SuggestionSnapshot {
  return {
    etag,
    imageTypes: [],
    choices: [],
    rules: [],
    defaultRules: [],
    thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
    decisionImage: {
      maxEdgePx: 1024,
      quality: 0.6,
      retryQuality: 0.45,
      targetBytes: 150_000,
      maxBytes: 400_000,
    },
    features: { suggestions: true, ruleLearning: true, location: false, decision: true },
  }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial))
  const storage: SnapshotStorage = {
    read: vi.fn(async (userId: string) => files.get(userId) ?? null),
    write: vi.fn(async (userId: string, value: string) => {
      files.set(userId, value)
    }),
    clearAll: vi.fn(async () => files.clear()),
  }
  return { files, storage }
}

describe('createSnapshotStore', () => {
  it('fetches, caches per user and revalidates with the cached ETag', async () => {
    const { files, storage } = memoryStorage()
    const store = createSnapshotStore(storage)
    await store.load('1', async () => ({ status: 'ok', snapshot: snapshot('"a"') }))
    expect(store.get().snapshot?.etag).toBe('"a"')
    expect(files.has('1')).toBe(true)

    const fresh = createSnapshotStore(storage)
    const fetcher = vi.fn(async () => ({ status: 'not_modified' as const }))
    await fresh.load('1', fetcher)
    expect(fetcher).toHaveBeenCalledWith('"a"')
    expect(fresh.get().snapshot?.etag).toBe('"a"')
  })

  it('keeps the cached snapshot when the network fails', async () => {
    const { storage } = memoryStorage({ '1': JSON.stringify(snapshot('"a"')) })
    const store = createSnapshotStore(storage)
    await store.load('1', async () => {
      throw new Error('offline')
    })
    expect(store.get().snapshot?.etag).toBe('"a"')
  })

  it('never shows one user the snapshot of another and clears everything on logout', async () => {
    const { files, storage } = memoryStorage({ '1': JSON.stringify(snapshot('"a"')) })
    const store = createSnapshotStore(storage)
    await store.load('1', async () => ({ status: 'not_modified' }))
    const fetcher = vi.fn(async () => ({ status: 'ok' as const, snapshot: snapshot('"b"') }))
    const loading = store.load('2', fetcher)
    expect(store.get()).toEqual({ userId: '2', snapshot: null })
    await loading
    expect(fetcher).toHaveBeenCalledWith(null)
    expect(store.get().snapshot?.etag).toBe('"b"')

    await store.clear()
    expect(store.get()).toEqual({ userId: null, snapshot: null })
    expect(files.size).toBe(0)
  })

  it('drops a response that arrives after logout', async () => {
    const { files, storage } = memoryStorage()
    const store = createSnapshotStore(storage)
    let resolve: (value: { status: 'ok'; snapshot: SuggestionSnapshot }) => void = () => undefined
    const loading = store.load(
      '1',
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    await Promise.resolve()
    await store.clear()
    resolve({ status: 'ok', snapshot: snapshot('"late"') })
    await loading
    expect(store.get().snapshot).toBeNull()
    expect(files.size).toBe(0)
  })

  it('ignores a corrupt cache', async () => {
    const { storage } = memoryStorage({ '1': '{not json' })
    const store = createSnapshotStore(storage)
    const fetcher = vi.fn(async () => ({ status: 'not_modified' as const }))
    await store.load('1', fetcher)
    expect(fetcher).toHaveBeenCalledWith(null)
    expect(store.get().snapshot).toBeNull()
  })
})
