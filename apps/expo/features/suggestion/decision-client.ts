import { File } from 'expo-file-system'
import { Platform } from 'react-native'

import { apiRequest } from '@/features/api/client'

import { parseInferenceResult, toRequestLocale } from './contract'
import type { DecisionRequest } from './session'
import type { InferenceResult } from './types'

// `POST /expense-inferences`: the compressed photo goes inline as multipart; the server picks an
// image type, category and personal choice from its own choice set within the deadline.

export const DEADLINE_HEADER = 'X-Billet-Deadline-Ms'

export async function requestInference(
  token: string,
  request: DecisionRequest,
): Promise<InferenceResult | null> {
  const form = new FormData()
  form.append('clientRequestId', request.clientRequestId)
  form.append('timezone', deviceTimezone())
  form.append('locale', toRequestLocale(Intl.DateTimeFormat().resolvedOptions().locale))
  if (request.placeKey) form.append('placeKey', request.placeKey)
  await appendImage(form, request.image.uri)

  const response = await apiRequest<unknown>('/expense-inferences', {
    method: 'POST',
    token,
    body: form,
    headers: { [DEADLINE_HEADER]: String(Math.max(0, Math.floor(request.deadlineMs))) },
    signal: request.signal,
  })
  return parseInferenceResult(response)
}

function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
}

async function appendImage(form: FormData, uri: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob()
    form.append('image', new Blob([blob], { type: 'image/jpeg' }), 'photo.jpg')
    return
  }
  // Expo's fetch rejects React Native `{ uri, name, type }` parts; it reads Blob-like parts
  // (anything with `bytes()`), and a `File` streams the temporary JPEG without a JS-side copy.
  form.append('image', new File(uri))
}
