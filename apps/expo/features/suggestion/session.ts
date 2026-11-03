import { toDecisionCandidates, toRuleContext } from './decision'
import { toMerchantKey } from './keys'
import { applySuggestion, createDraft, finalizeProvenance, merge, userEdit } from './merge'
import type { MergeConfig, SuggestionDraft } from './merge'
import { parseReceipt, toOcrCandidates } from './receipt-parser'
import type { OcrResult } from './receipt-parser'
import { evaluateRules } from './rule-evaluator'
import type {
  DecisionImageConfig,
  FieldProvenanceMap,
  InferenceResult,
  SuggestionField,
  SuggestionSnapshot,
} from './types'

// Orchestrates one photo suggestion session ("lượt"): once started, OCR, compression → Decision and
// the place key run in parallel; their results are merged into one draft. Pure apart from the
// injected dependencies, so it is unit-tested with fakes.

/** Budget from the moment the photo exists until the session stops accepting results. */
export const SUGGESTION_BUDGET_MS = 8_000
/** The server skips the provider below this budget, so the client does not send the photo. */
export const MIN_DECISION_BUDGET_MS = 1_000
/** How long the Decision request waits for the place key before it is sent without one. */
export const PLACE_KEY_TIMEOUT_MS = 1_500
/** Re-evaluating rules can change the merchant, which changes the context again; stop here. */
const MAX_RULE_PASSES = 3

export type CompressedImage = { uri: string; bytes: number; mimeType: 'image/jpeg' }

export type DecisionRequest = {
  image: CompressedImage
  clientRequestId: string
  placeKey: string | null
  /** Remaining budget, sent as `X-Billet-Deadline-Ms`. */
  deadlineMs: number
  signal: AbortSignal
}

export type SuggestionSessionDeps = {
  /** `null` when OCR is not available (Expo Go, web) or failed. */
  recognizeText(uri: string): Promise<OcrResult | null>
  /** `null` when the photo cannot be brought under `maxBytes`. */
  compressImage(uri: string, config: DecisionImageConfig): Promise<CompressedImage | null>
  /** `null` on any failure; the session never retries. */
  requestDecision(request: DecisionRequest): Promise<InferenceResult | null>
  /** Called once the compressed image is no longer needed (sent, skipped or cancelled). */
  discardImage?(image: CompressedImage): void
  /** `null` unless location permission is already granted and a position is available. */
  readPlaceKey(): Promise<string | null>
  createRequestId(): string
  now(): number
  /** Returns a function that cancels the timer. */
  setTimer(callback: () => void, ms: number): () => void
}

export type SuggestionSessionInput = {
  generation: number
  /** `null` for a manual entry: the draft works but no branch runs. */
  imageUri: string | null
  /** Epoch milliseconds when the photo became available. */
  capturedAt: number
  /** Without a snapshot the account settings are unknown, so nothing runs. */
  snapshot: SuggestionSnapshot | null
}

export type BranchStatus = 'idle' | 'pending' | 'done' | 'failed' | 'skipped'

export type SuggestionBranches = {
  ocr: BranchStatus
  decision: BranchStatus
  location: BranchStatus
}

export type SuggestionSessionStatus = 'active' | 'ended' | 'cancelled'

export type SuggestionSessionState = {
  generation: number
  status: SuggestionSessionStatus
  draft: SuggestionDraft
  inference: InferenceResult | null
  placeKey: string | null
  branches: SuggestionBranches
}

/** Extra fields for `POST /expenses` (server `CreateExpenseDto`). */
export type SuggestionSavePayload = {
  inferenceId?: string
  imageType?: string
  personalChoiceId?: string
  placeKey?: string
  merchantKey?: string
  fieldProvenance: FieldProvenanceMap
}

export type SuggestionSession = {
  readonly generation: number
  getState(): SuggestionSessionState
  subscribe(listener: () => void): () => void
  /** Starts the branches. Calling it again or after the session stopped does nothing. */
  start(): void
  edit(field: SuggestionField, value: string | null | undefined): void
  apply(field: SuggestionField, candidateId: string): void
  savePayload(): SuggestionSavePayload
  /** Save succeeded: stop accepting results. */
  finish(): void
  /** Retake, cancel or logout: abort requests and discard late results. */
  cancel(): void
}

const DEFAULT_THRESHOLDS = { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 }

export function createSuggestionSession(
  deps: SuggestionSessionDeps,
  input: SuggestionSessionInput,
): SuggestionSession {
  const { generation, imageUri, capturedAt, snapshot } = input
  const config: MergeConfig = { thresholds: snapshot?.thresholds ?? DEFAULT_THRESHOLDS }
  const rules = snapshot ? [...snapshot.rules, ...snapshot.defaultRules] : []
  const abort = new AbortController()
  const listeners = new Set<() => void>()
  const timers = new Set<() => void>()
  let started = false
  let lastRuleContext: string | null = null
  let state: SuggestionSessionState = {
    generation,
    status: 'active',
    draft: createDraft({ generation, captureTime: new Date(capturedAt) }),
    inference: null,
    placeKey: null,
    branches: { ocr: 'idle', decision: 'idle', location: 'idle' },
  }

  const live = () => state.status === 'active'

  const set = (patch: Partial<SuggestionSessionState>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

  const setBranch = (branch: keyof SuggestionBranches, status: BranchStatus) => {
    if (state.branches[branch] === status) return
    set({ branches: { ...state.branches, [branch]: status } })
  }

  // Rules depend on the choice, image type, place key and merchant key; re-run only on change.
  const rulePass = (draft: SuggestionDraft): SuggestionDraft => {
    if (!snapshot || rules.length === 0) return draft
    let next = draft
    for (let pass = 0; pass < MAX_RULE_PASSES; pass += 1) {
      const context = toRuleContext(state.inference, {
        placeKey: state.placeKey,
        merchantKey: toMerchantKey(next.values.merchant),
      })
      const key = JSON.stringify(context)
      if (key === lastRuleContext) break
      lastRuleContext = key
      next = merge(next, evaluateRules(rules, context, { generation }), config)
    }
    return next
  }

  const stop = (status: Exclude<SuggestionSessionStatus, 'active'>) => {
    if (!live()) return
    for (const cancel of timers) cancel()
    timers.clear()
    abort.abort()
    const branches = { ...state.branches }
    for (const key of Object.keys(branches) as (keyof SuggestionBranches)[]) {
      if (branches[key] === 'pending' || branches[key] === 'idle') branches[key] = 'skipped'
    }
    set({ status, branches })
  }

  const timer = (callback: () => void, ms: number) => {
    const cancel = deps.setTimer(() => {
      timers.delete(cancel)
      callback()
    }, ms)
    timers.add(cancel)
    return cancel
  }

  const runOcr = async (uri: string) => {
    setBranch('ocr', 'pending')
    try {
      const result = await deps.recognizeText(uri)
      if (!live()) return
      if (!result) {
        setBranch('ocr', 'failed')
        return
      }
      const parsed = parseReceipt(result, { captureTime: new Date(capturedAt) })
      const draft = rulePass(merge(state.draft, toOcrCandidates(parsed, generation), config))
      set({ draft, branches: { ...state.branches, ocr: 'done' } })
    } catch {
      if (live()) setBranch('ocr', 'failed')
    }
  }

  const runLocation = (): Promise<string | null> => {
    if (!snapshot?.features.location) {
      setBranch('location', 'skipped')
      return Promise.resolve(null)
    }
    setBranch('location', 'pending')
    const read = deps.readPlaceKey().then(
      (placeKey) => {
        if (!live()) return null
        if (!placeKey) {
          setBranch('location', 'failed')
          return null
        }
        set({ placeKey, branches: { ...state.branches, location: 'done' } })
        const draft = rulePass(state.draft)
        if (draft !== state.draft) set({ draft })
        return placeKey
      },
      () => {
        if (live()) setBranch('location', 'failed')
        return null
      },
    )
    return new Promise((resolve) => {
      const cancel = timer(() => resolve(null), PLACE_KEY_TIMEOUT_MS)
      void read.then((placeKey) => {
        cancel()
        timers.delete(cancel)
        resolve(placeKey)
      })
    })
  }

  const runDecision = async (uri: string, placeKey: Promise<string | null>) => {
    if (!snapshot?.features.suggestions || snapshot.features.decision === false) {
      setBranch('decision', 'skipped')
      return
    }
    setBranch('decision', 'pending')
    try {
      const [image, place] = await Promise.all([
        deps.compressImage(uri, snapshot.decisionImage).catch(() => null),
        placeKey,
      ])
      if (!image) {
        if (live()) setBranch('decision', 'failed')
        return
      }
      let result: InferenceResult | null
      try {
        if (!live()) return
        const deadlineMs = Math.floor(SUGGESTION_BUDGET_MS - (deps.now() - capturedAt))
        if (deadlineMs < MIN_DECISION_BUDGET_MS) {
          setBranch('decision', 'failed')
          return
        }
        result = await deps.requestDecision({
          image,
          clientRequestId: deps.createRequestId(),
          placeKey: place,
          deadlineMs,
          signal: abort.signal,
        })
      } finally {
        deps.discardImage?.(image)
      }
      if (!live()) return
      if (result?.status !== 'succeeded') {
        set({ inference: result, branches: { ...state.branches, decision: 'failed' } })
        return
      }
      set({ inference: result })
      const draft = rulePass(merge(state.draft, toDecisionCandidates(result, generation), config))
      set({ draft, branches: { ...state.branches, decision: 'done' } })
    } catch {
      if (live()) setBranch('decision', 'failed')
    }
  }

  return {
    generation,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start() {
      if (started || !live()) return
      started = true
      if (!imageUri || !snapshot?.features.suggestions) {
        stop('ended')
        return
      }
      const remaining = SUGGESTION_BUDGET_MS - (deps.now() - capturedAt)
      if (remaining <= 0) {
        stop('ended')
        return
      }
      timer(() => stop('ended'), remaining)
      const draft = rulePass(state.draft)
      if (draft !== state.draft) set({ draft })
      void runOcr(imageUri)
      void runDecision(imageUri, runLocation())
    },
    edit(field, value) {
      const edited = userEdit(state.draft, field, value)
      set({ draft: live() ? rulePass(edited) : edited })
    },
    apply(field, candidateId) {
      const applied = applySuggestion(state.draft, field, candidateId)
      if (applied === state.draft) return
      set({ draft: live() ? rulePass(applied) : applied })
    },
    savePayload() {
      const succeeded = state.inference?.status === 'succeeded' ? state.inference : null
      const merchantKey = toMerchantKey(state.draft.values.merchant)
      const payload: SuggestionSavePayload = { fieldProvenance: finalizeProvenance(state.draft) }
      if (succeeded) payload.inferenceId = succeeded.id
      if (succeeded?.imageType) payload.imageType = succeeded.imageType.id
      if (succeeded?.personalChoice) payload.personalChoiceId = succeeded.personalChoice.id
      if (state.placeKey) payload.placeKey = state.placeKey
      if (merchantKey) payload.merchantKey = merchantKey
      return payload
    },
    finish: () => stop('ended'),
    cancel: () => stop('cancelled'),
  }
}

export type SuggestionSessionRegistry = {
  /** Cancels the previous session and creates a new one, not started, with a fresh generation. */
  create(input: Omit<SuggestionSessionInput, 'generation'>): SuggestionSession
  get(generation: number): SuggestionSession | null
  cancelAll(): void
}

/** Holds the one current session so the capture and review screens can share it. */
export function createSessionRegistry(deps: SuggestionSessionDeps): SuggestionSessionRegistry {
  let generation = 0
  let current: SuggestionSession | null = null
  return {
    create(input) {
      current?.cancel()
      generation += 1
      current = createSuggestionSession(deps, { ...input, generation })
      return current
    },
    get: (wanted) => (current?.generation === wanted ? current : null),
    cancelAll() {
      current?.cancel()
      current = null
    },
  }
}
