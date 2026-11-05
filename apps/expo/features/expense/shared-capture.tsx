import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Alert, Platform } from 'react-native'

import { useSession } from '@/features/auth/session'
import { decideArrival, useShareInbox, type SharedImage } from '@/features/share'
import { useBiometricLock } from '@/features/settings/biometric-lock'
import { usePreparePhotoSuggestion } from '@/features/suggestion'
import { useCaptureFlow } from './capture-flow'

export function SharedCaptureCoordinator() {
  const { token } = useSession()
  const biometric = useBiometricLock()
  const { pending, error, dismissError, completeSharedImage, openSharedImage } = useShareInbox()
  const { reviewState, allowReviewReplacement, replacementAllowed } = useCaptureFlow()
  const prepareSuggestion = usePreparePhotoSuggestion()
  const openingId = useRef<string | null>(null)
  const askedId = useRef<string | null>(null)
  const shownError = useRef<unknown>(null)

  useEffect(() => {
    if (!error || shownError.current === error) return
    shownError.current = error
    Alert.alert('Không thể nhận ảnh', error.message, [{ text: 'Đóng', onPress: dismissError }])
  }, [dismissError, error])

  useEffect(() => {
    if (reviewState.sharedImageId === openingId.current) openingId.current = null
  }, [reviewState.sharedImageId])

  useEffect(() => {
    if (
      !pending ||
      !token ||
      biometric.loading ||
      biometric.locked ||
      pending.id === reviewState.sharedImageId ||
      pending.id === openingId.current
    ) {
      return
    }
    const decision = decideArrival({ draft: reviewState.draft, reviewActive: reviewState.active })
    if (decision === 'defer') return

    const open = (image: SharedImage) => {
      openingId.current = image.id
      openSharedImage(image)
      if (reviewState.active && !replacementAllowed) allowReviewReplacement()
      const suggestionGeneration = prepareSuggestion({
        imageUri: image.uri,
        capturedAt: image.receivedAt,
      })
      const destination = {
        pathname: '/review' as const,
        params: {
          imageUri: image.uri,
          capturedAt: image.receivedAt,
          source: 'shared',
          sharedImageId: image.id,
          suggestionGeneration: String(suggestionGeneration),
        },
      }
      requestAnimationFrame(() => {
        if (reviewState.active) router.replace(destination)
        else router.push(destination)
      })
    }

    if (decision === 'open' || decision === 'replace') {
      open(pending)
      return
    }
    if (askedId.current === pending.id) return
    askedId.current = pending.id
    const keep = () => {
      void completeSharedImage(pending.id)
      askedId.current = null
    }
    const replace = () => {
      askedId.current = null
      open(pending)
    }
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Thay bằng ảnh vừa chia sẻ? Nội dung đang sửa sẽ bị bỏ.')) replace()
      else keep()
      return
    }
    Alert.alert('Thay bằng ảnh vừa chia sẻ?', 'Nội dung đang sửa sẽ bị bỏ.', [
      { text: 'Giữ bản đang sửa', style: 'cancel', onPress: keep },
      { text: 'Thay ảnh', style: 'destructive', onPress: replace },
    ])
  }, [
    allowReviewReplacement,
    biometric.loading,
    biometric.locked,
    completeSharedImage,
    openSharedImage,
    pending,
    prepareSuggestion,
    replacementAllowed,
    reviewState,
    token,
  ])

  return null
}
