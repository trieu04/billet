import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

import { bestSuggestion } from './merge'
import type { PendingSuggestion, SuggestionDraft } from './merge'
import {
  createSuggestionSession,
  type SuggestionSavePayload,
  type SuggestionSession,
  type SuggestionSessionDeps,
} from './session'
import { describeSource, machineProvenance } from './source-label'
import { useSuggestionContext } from './suggestion-provider'
import type { SuggestionField } from './types'

export type PhotoSuggestionChip = PendingSuggestion & { label: string | null }

export type PhotoSuggestion = {
  /** A photo session exists for this screen (otherwise the draft is manual-only). */
  active: boolean
  /** OCR or Decision is still running. */
  pending: boolean
  draft: SuggestionDraft
  /** Starts OCR and Decision; call it once the photo is on screen. Safe to call repeatedly. */
  begin(): void
  /** Source label for a machine-filled value, for example “Từ hóa đơn”. */
  sourceLabel(field: SuggestionField): string | null
  /** Best tap-to-apply suggestion for a field. */
  suggestion(field: SuggestionField): PhotoSuggestionChip | null
  edit(field: SuggestionField, value: string | null | undefined): void
  apply(field: SuggestionField, candidateId: string): void
  /** Extra expense fields to send on create; `null` without a photo session. */
  savePayload(): SuggestionSavePayload | null
  /** Call after a successful save. */
  finish(): void
  /** Call when the photo is discarded (retake, cancel). */
  cancel(): void
}

const noSuggestions: SuggestionSessionDeps = {
  recognizeText: async () => null,
  compressImage: async () => null,
  requestDecision: async () => null,
  readPlaceKey: async () => null,
  createRequestId: () => 'manual-entry',
  now: () => Date.now(),
  setTimer: () => () => undefined,
}

function manualSession(captureTime: string): SuggestionSession {
  const time = Date.parse(captureTime)
  const session = createSuggestionSession(noSuggestions, {
    generation: 0,
    imageUri: null,
    capturedAt: Number.isFinite(time) ? time : Date.now(),
    snapshot: null,
  })
  session.start()
  return session
}

/**
 * The expense draft for the review screen. With the generation of a session created on the
 * capture screen it follows that session; otherwise it is a plain manual draft.
 */
export function usePhotoSuggestion(
  generation: number | undefined,
  captureTime: string,
): PhotoSuggestion {
  const context = useSuggestionContext()
  const [{ session, active }] = useState(() => {
    const found = generation === undefined ? null : context.getSession(generation)
    return found
      ? { session: found, active: true }
      : { session: manualSession(captureTime), active: false }
  })
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState)
  const snapshotState = useSyncExternalStore(
    context.store.subscribe,
    context.store.get,
    context.store.get,
  )
  const choices = useMemo(() => snapshotState.snapshot?.choices ?? [], [snapshotState])
  const { draft } = state

  const sourceLabel = useCallback(
    (field: SuggestionField) => describeSource(machineProvenance(draft, field), choices),
    [choices, draft],
  )
  const suggestion = useCallback(
    (field: SuggestionField): PhotoSuggestionChip | null => {
      const best = bestSuggestion(draft, field)
      return best ? { ...best, label: describeSource(best, choices) } : null
    },
    [choices, draft],
  )

  return useMemo(
    () => ({
      active,
      pending:
        state.status === 'active' &&
        (state.branches.ocr === 'pending' || state.branches.decision === 'pending'),
      draft,
      begin: session.start,
      sourceLabel,
      suggestion,
      edit: session.edit,
      apply: session.apply,
      savePayload: () => (active ? session.savePayload() : null),
      finish: session.finish,
      cancel: session.cancel,
    }),
    [active, draft, session, sourceLabel, state.branches, state.status, suggestion],
  )
}
