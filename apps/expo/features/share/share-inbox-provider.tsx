/* oxlint-disable react/only-export-components */
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as Crypto from 'expo-crypto'
import {
  getScheme,
  getShareExtensionKey,
  ShareIntentModule,
  ShareIntentProvider,
  useShareIntentContext,
} from 'expo-share-intent'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState, Platform } from 'react-native'

import { useSession } from '@/features/auth/session'
import {
  clearShareInbox,
  completeStoredImage,
  loadSharedImage,
  restoreStoredImage,
  storeSharedImage,
} from './inbox-storage'
import { discardAdapterFile, discardNormalizedImage, normalizeSharedImage } from './normalize'
import { classifyPayload, type ShareIntakeError, type SharedImage } from './share-model'

type ShareInboxContextValue = {
  pending: SharedImage | null
  error: ShareIntakeError | null
  dismissError(): void
  completeSharedImage(id: string): Promise<void>
  /** Marks the image shown in review; an image it replaces is deleted. */
  openSharedImage(image: SharedImage): void
}

const ShareInboxContext = createContext<ShareInboxContextValue | null>(null)
const adapterDisabled =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export function ShareInboxProvider({ children }: PropsWithChildren) {
  return (
    <ShareIntentProvider options={{ disabled: adapterDisabled, resetOnBackground: false }}>
      <ShareInboxState>{children}</ShareInboxState>
    </ShareIntentProvider>
  )
}

function ShareInboxState({ children }: PropsWithChildren) {
  const { token, ready } = useSession()
  const adapter = useShareIntentContext()
  const [pending, setPending] = useState<SharedImage | null>(null)
  const [error, setError] = useState<ShareIntakeError | null>(null)
  const previousToken = useRef<string | null>(null)
  const processing = useRef<string | null>(null)
  const pendingRef = useRef<SharedImage | null>(null)
  const openedRef = useRef<SharedImage | null>(null)

  const updatePending = useCallback((image: SharedImage | null) => {
    pendingRef.current = image
    setPending(image)
  }, [])

  useEffect(() => {
    if (adapterDisabled) return
    void loadSharedImage()
      .then((image) => {
        if (!pendingRef.current) updatePending(image)
      })
      .catch(() => setError({ code: 'storage', message: 'Không thể đọc ảnh đang chờ.' }))
  }, [updatePending])

  // The extension cannot always open the app, so iOS also reads the App Group on every activation.
  useEffect(() => {
    if (adapterDisabled || Platform.OS !== 'ios') return
    const url = `${getScheme()}://dataUrl=${getShareExtensionKey()}#media`
    const read = () =>
      void Promise.resolve()
        .then(() => ShareIntentModule?.getShareIntent(url))
        .catch(() => undefined)
    read()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read()
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (previousToken.current && !token) {
      openedRef.current = null
      void clearShareInbox().finally(() => updatePending(null))
    }
    previousToken.current = token
  }, [ready, token, updatePending])

  useEffect(() => {
    if (!adapter.hasShareIntent) return
    const classification = classifyPayload(adapter.shareIntent.files)
    if (!classification.ok) {
      queueMicrotask(() => setError(classification.error))
      for (const file of adapter.shareIntent.files ?? []) void discardAdapterFile(file.path)
      adapter.resetShareIntent()
      return
    }
    const file = classification.file
    if (processing.current === file.path) return
    processing.current = file.path
    void (async () => {
      let normalizedUri: string | null = null
      try {
        normalizedUri = await normalizeSharedImage(file.path)
        const shared = await storeSharedImage({
          id: Crypto.randomUUID(),
          normalizedUri,
          receivedAt: new Date().toISOString(),
        })
        const replaced = pendingRef.current
        if (replaced && replaced.id !== openedRef.current?.id)
          await completeStoredImage(replaced.id)
        updatePending(shared)
        setError(null)
      } catch {
        setError({ code: 'decode', message: 'Không thể đọc ảnh được chia sẻ.' })
      } finally {
        if (normalizedUri) await discardNormalizedImage(normalizedUri)
        await discardAdapterFile(file.path)
        adapter.resetShareIntent()
        processing.current = null
      }
    })()
  }, [adapter, updatePending])

  const completeSharedImage = useCallback(
    async (id: string) => {
      if (openedRef.current?.id === id) openedRef.current = null
      await completeStoredImage(id)
      if (pendingRef.current?.id !== id) return
      const opened = openedRef.current
      if (opened) await restoreStoredImage(opened)
      updatePending(opened)
    },
    [updatePending],
  )
  const openSharedImage = useCallback((image: SharedImage) => {
    const previous = openedRef.current
    openedRef.current = image
    if (previous && previous.id !== image.id) {
      void completeStoredImage(previous.id).catch(() => undefined)
    }
  }, [])
  const value = useMemo<ShareInboxContextValue>(
    () => ({
      pending,
      error:
        error ??
        (adapter.error ? { code: 'adapter', message: 'Không thể nhận ảnh được chia sẻ.' } : null),
      dismissError: () => setError(null),
      completeSharedImage,
      openSharedImage,
    }),
    [adapter.error, completeSharedImage, error, openSharedImage, pending],
  )
  return <ShareInboxContext.Provider value={value}>{children}</ShareInboxContext.Provider>
}

export function useShareInbox() {
  const value = useContext(ShareInboxContext)
  if (!value) throw new Error('useShareInbox must be used inside ShareInboxProvider')
  return value
}
