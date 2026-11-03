/* oxlint-disable react/only-export-components */
import * as Crypto from 'expo-crypto'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { ApiError, apiRequest } from '@/features/api/client'
import { useSession } from '@/features/auth/session'

import { compressForDecision, discardImageFile } from './compress'
import { parseSnapshot } from './contract'
import { requestInference } from './decision-client'
import { readPlaceKey } from './location'
import { recognizeText } from './ocr'
import {
  createSessionRegistry,
  type SuggestionSession,
  type SuggestionSessionDeps,
} from './session'
import { snapshotStorage } from './snapshot-storage'
import { createSnapshotStore, type SnapshotFetcher, type SnapshotStore } from './snapshot-store'

type SuggestionContextValue = {
  /** Creates a session for a photo the camera or picker returned; returns its generation. */
  preparePhotoSuggestion(input: { imageUri: string; capturedAt: string }): number
  getSession(generation: number): SuggestionSession | null
  /** Revalidates the snapshot, for example after a suggestion setting changed. */
  refreshSnapshot(): Promise<void>
  store: SnapshotStore
}

const SuggestionContext = createContext<SuggestionContextValue | null>(null)

/** Network, native and timer dependencies of the sessions; the token is read when needed. */
function createSuggestionServices(initialToken: string | null) {
  let token = initialToken
  const fetchSnapshot: SnapshotFetcher = async (etag) => {
    const accessToken = token
    if (!accessToken) throw new Error('Not signed in')
    try {
      const value = await apiRequest<unknown>('/suggestion-config', {
        token: accessToken,
        headers: etag ? { 'If-None-Match': etag } : undefined,
      })
      const snapshot = parseSnapshot(value)
      if (!snapshot) throw new Error('Invalid suggestion snapshot')
      return { status: 'ok', snapshot }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 304) return { status: 'not_modified' }
      throw reason
    }
  }

  const deps: SuggestionSessionDeps = {
    recognizeText,
    compressImage: compressForDecision,
    async requestDecision(request) {
      const accessToken = token
      if (!accessToken) return null
      try {
        return await requestInference(accessToken, request)
      } catch {
        return null
      }
    },
    discardImage: (image) => void discardImageFile(image.uri),
    readPlaceKey,
    createRequestId: () => `photo-${Crypto.randomUUID()}`,
    now: () => Date.now(),
    setTimer(callback, ms) {
      const timeout = setTimeout(callback, ms)
      return () => clearTimeout(timeout)
    },
  }
  return {
    fetchSnapshot,
    registry: createSessionRegistry(deps),
    setToken(next: string | null) {
      token = next
    },
  }
}

/**
 * Owns the suggestion snapshot and the current photo session. Loads the snapshot when the app
 * opens with a signed-in user or a user logs in, and clears it (and cancels any session) when
 * nobody is signed in.
 */
export function SuggestionProvider({ children }: PropsWithChildren) {
  const { ready, token, user } = useSession()
  const [store] = useState(() => createSnapshotStore(snapshotStorage))
  const [services] = useState(() => createSuggestionServices(token))

  // Requests read the latest token, including one refreshed while a session is running.
  useEffect(() => {
    services.setToken(token)
  }, [services, token])

  const userId = user?.id ?? null
  useEffect(() => {
    if (!ready) return
    if (!userId) {
      services.registry.cancelAll()
      void store.clear()
      return
    }
    void store.load(userId, services.fetchSnapshot)
  }, [ready, services, store, userId])

  useEffect(() => () => services.registry.cancelAll(), [services])

  const value = useMemo<SuggestionContextValue>(
    () => ({
      preparePhotoSuggestion({ imageUri, capturedAt }) {
        const current = store.get()
        const time = Date.parse(capturedAt)
        return services.registry.create({
          imageUri,
          capturedAt: Number.isFinite(time) ? time : Date.now(),
          snapshot: userId && current.userId === userId ? current.snapshot : null,
        }).generation
      },
      getSession: (generation) => services.registry.get(generation),
      async refreshSnapshot() {
        if (userId) await store.load(userId, services.fetchSnapshot)
      },
      store,
    }),
    [services, store, userId],
  )

  return <SuggestionContext.Provider value={value}>{children}</SuggestionContext.Provider>
}

export function useSuggestionContext() {
  const value = useContext(SuggestionContext)
  if (!value) throw new Error('Suggestion hooks must be used inside SuggestionProvider')
  return value
}

/** Creates a suggestion session; the review screen starts it once the photo is on screen. */
export function usePreparePhotoSuggestion() {
  return useSuggestionContext().preparePhotoSuggestion
}

/** Revalidates the suggestion snapshot (cheap: ETag). */
export function useRefreshSuggestionSnapshot() {
  return useSuggestionContext().refreshSnapshot
}
