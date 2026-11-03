import { describe, expect, it, vi } from 'vitest'
import { CAPTURE_TIME, receiptFixtures } from './receipt-fixtures'
import {
  MIN_DECISION_BUDGET_MS,
  PLACE_KEY_TIMEOUT_MS,
  SUGGESTION_BUDGET_MS,
  createSessionRegistry,
  createSuggestionSession,
} from './session'
import type { CompressedImage, DecisionRequest, SuggestionSessionDeps } from './session'
import type { OcrResult } from './receipt-parser'
import type { InferenceResult, SuggestionRule, SuggestionSnapshot } from './types'

const capturedAt = Date.parse(CAPTURE_TIME)

function fixture(name: string): OcrResult {
  const found = receiptFixtures.find((item) => item.name.startsWith(name))
  if (!found) throw new Error(`missing fixture ${name}`)
  return { lines: found.lines }
}

const parkingRule: SuggestionRule = {
  id: 'rule-parking-a',
  origin: 'learned',
  conditions: { choiceId: 'choice-parking-a' },
  actions: { amountMinor: '5000', currency: 'VND', categoryId: 'cat-transport' },
  confidence: 0.8,
  updatedAt: '2026-10-25T00:00:00.000Z',
}

const placeRule: SuggestionRule = {
  id: 'rule-place',
  origin: 'user',
  conditions: { placeKey: 'w3gv2c1' },
  actions: { categoryId: 'cat-place' },
  confidence: 0.9,
  updatedAt: '2026-10-25T00:00:00.000Z',
}

function snapshot(overrides: Partial<SuggestionSnapshot> = {}): SuggestionSnapshot {
  return {
    etag: '"v1"',
    imageTypes: [],
    choices: [{ id: 'choice-parking-a', label: 'Gửi xe – Tòa A' }],
    rules: [parkingRule],
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
    ...overrides,
  }
}

const parkingInference: InferenceResult = {
  id: '77',
  status: 'succeeded',
  choiceSetVersion: 'v1',
  imageType: { id: 'parking_ticket', confidence: 0.93 },
  category: null,
  personalChoice: { id: 'choice-parking-a', confidence: 0.85 },
  provider: 'fake',
  model: 'fake',
  latencyMs: 2400,
}

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const image: CompressedImage = { uri: 'file:///small.jpg', bytes: 120_000, mimeType: 'image/jpeg' }

/** Fake dependencies with a manual clock; every async branch is resolved by the test. */
function harness() {
  let now = capturedAt
  const timers: { at: number; callback: () => void; cancelled: boolean }[] = []
  const ocr = deferred<OcrResult | null>()
  const compress = deferred<CompressedImage | null>()
  const decision = deferred<InferenceResult | null>()
  const place = deferred<string | null>()
  const requests: DecisionRequest[] = []
  const deps: SuggestionSessionDeps = {
    recognizeText: vi.fn(() => ocr.promise),
    compressImage: vi.fn(() => compress.promise),
    requestDecision: vi.fn((request: DecisionRequest) => {
      requests.push(request)
      return decision.promise
    }),
    readPlaceKey: vi.fn(() => place.promise),
    discardImage: vi.fn(),
    createRequestId: () => 'photo-0001',
    now: () => now,
    setTimer(callback, ms) {
      const timer = { at: now + ms, callback, cancelled: false }
      timers.push(timer)
      return () => {
        timer.cancelled = true
      }
    },
  }
  const advance = async (ms: number) => {
    now += ms
    for (const timer of timers) {
      if (!timer.cancelled && timer.at <= now) {
        timer.cancelled = true
        timer.callback()
      }
    }
    await flush()
  }
  return { deps, ocr, compress, decision, place, requests, advance }
}

const flush = async () => {
  for (let index = 0; index < 5; index += 1) await Promise.resolve()
}

describe('createSuggestionSession', () => {
  it('runs OCR and Decision in parallel and merges both into the draft', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    expect(h.deps.recognizeText).toHaveBeenCalledWith('file:///photo.jpg')
    expect(h.deps.compressImage).toHaveBeenCalledWith('file:///photo.jpg', expect.any(Object))
    expect(session.getState().branches).toMatchObject({ ocr: 'pending', decision: 'pending' })

    h.ocr.resolve(fixture('parking ticket'))
    await flush()
    expect(session.getState().draft.values.merchant).toBe('BÃI GIỮ XE TÒA A')

    await h.advance(300)
    h.compress.resolve(image)
    await flush()
    expect(h.requests[0]).toMatchObject({
      clientRequestId: 'photo-0001',
      placeKey: null,
      deadlineMs: SUGGESTION_BUDGET_MS - 300,
      image,
    })

    h.decision.resolve(parkingInference)
    await flush()
    const state = session.getState()
    expect(state.draft.values.amountMinor).toBe('5000')
    expect(state.draft.values.categoryId).toBe('cat-transport')
    expect(state.branches).toMatchObject({ ocr: 'done', decision: 'done', location: 'skipped' })
    expect(session.savePayload()).toEqual({
      inferenceId: '77',
      imageType: 'parking_ticket',
      personalChoiceId: 'choice-parking-a',
      merchantKey: 'bai giu xe toa a',
      fieldProvenance: expect.objectContaining({
        amountMinor: expect.objectContaining({ source: 'personal_rule', outcome: 'accepted' }),
        merchant: expect.objectContaining({ source: 'ocr', outcome: 'accepted' }),
      }),
    })
  })

  it('skips Decision when the provider is disabled but still runs OCR', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot({
        features: { suggestions: true, ruleLearning: true, location: false, decision: false },
      }),
    })
    session.start()
    expect(h.deps.compressImage).not.toHaveBeenCalled()
    expect(session.getState().branches.decision).toBe('skipped')
    h.ocr.resolve(fixture('coffee shop with diacritics'))
    await flush()
    expect(session.getState().draft.values.amountMinor).toBe('58000')
  })

  it('does nothing when suggestions are off, there is no snapshot, or no photo', () => {
    for (const input of [
      {
        imageUri: 'file:///photo.jpg',
        snapshot: snapshot({
          features: { suggestions: false, ruleLearning: true, location: true, decision: true },
        }),
      },
      { imageUri: 'file:///photo.jpg', snapshot: null },
      { imageUri: null, snapshot: snapshot() },
    ]) {
      const h = harness()
      const session = createSuggestionSession(h.deps, { generation: 1, capturedAt, ...input })
      session.start()
      expect(h.deps.recognizeText).not.toHaveBeenCalled()
      expect(h.deps.compressImage).not.toHaveBeenCalled()
      expect(h.deps.readPlaceKey).not.toHaveBeenCalled()
      expect(session.getState().status).toBe('ended')
      session.edit('amountMinor', '12000')
      expect(session.getState().draft.values.amountMinor).toBe('12000')
    }
  })

  it('ends after the 8 s budget, aborts the request and ignores late results', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    h.compress.resolve(image)
    await flush()
    const signal = h.requests[0]?.signal
    await h.advance(SUGGESTION_BUDGET_MS)
    expect(session.getState().status).toBe('ended')
    expect(signal?.aborted).toBe(true)

    h.decision.resolve(parkingInference)
    h.ocr.resolve(fixture('coffee shop with diacritics'))
    await flush()
    expect(session.getState().draft.values.amountMinor).toBeUndefined()
    expect(session.savePayload().inferenceId).toBeUndefined()
  })

  it('does not send the photo when less than the minimum budget remains', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    await h.advance(SUGGESTION_BUDGET_MS - MIN_DECISION_BUDGET_MS + 1)
    h.compress.resolve(image)
    await flush()
    expect(h.deps.requestDecision).not.toHaveBeenCalled()
    expect(h.deps.discardImage).toHaveBeenCalledWith(image)
    expect(session.getState().branches.decision).toBe('failed')
  })

  it('cancel aborts and discards everything that arrives afterwards', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    h.compress.resolve(image)
    await flush()
    session.cancel()
    expect(h.requests[0]?.signal.aborted).toBe(true)
    h.ocr.resolve(fixture('coffee shop with diacritics'))
    h.decision.resolve(parkingInference)
    await flush()
    expect(h.deps.discardImage).toHaveBeenCalledWith(image)
    expect(session.getState().status).toBe('cancelled')
    expect(session.getState().draft.values.amountMinor).toBeUndefined()
  })

  it('treats every branch failure as no suggestion from that branch, without retry', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    h.ocr.reject(new Error('vision failed'))
    h.compress.resolve(image)
    await flush()
    h.decision.reject(new Error('network'))
    await flush()
    expect(session.getState().branches).toMatchObject({ ocr: 'failed', decision: 'failed' })
    expect(h.deps.requestDecision).toHaveBeenCalledTimes(1)
    expect(h.deps.recognizeText).toHaveBeenCalledTimes(1)
    session.edit('amountMinor', '30000')
    expect(session.savePayload()).toEqual({
      fieldProvenance: {
        amountMinor: { source: 'user', outcome: 'entered' },
        occurredAt: { source: 'capture_time', outcome: 'accepted' },
      },
    })
  })

  it('an unavailable inference gives no suggestion and no inference id', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    h.compress.resolve(image)
    await flush()
    h.decision.resolve({
      ...parkingInference,
      status: 'unavailable',
      reason: 'timeout',
      imageType: null,
      personalChoice: null,
    })
    await flush()
    expect(session.getState().branches.decision).toBe('failed')
    expect(session.savePayload().inferenceId).toBeUndefined()
  })

  it('results after a user edit only become tap-to-apply suggestions', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.start()
    session.edit('amountMinor', '4000')
    h.compress.resolve(image)
    await flush()
    h.decision.resolve(parkingInference)
    await flush()
    const { draft } = session.getState()
    expect(draft.values.amountMinor).toBe('4000')
    expect(draft.values.categoryId).toBeUndefined()
    const suggestion = draft.suggestions.categoryId?.[0]
    expect(suggestion?.value).toBe('cat-transport')
    session.apply('categoryId', suggestion?.candidateId ?? '')
    expect(session.getState().draft.values.categoryId).toBe('cat-transport')
  })

  it('reads the place key when allowed, sends it and re-runs rules', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot({
        rules: [placeRule],
        features: { suggestions: true, ruleLearning: true, location: true, decision: true },
      }),
    })
    session.start()
    h.place.resolve('w3gv2c1')
    await flush()
    expect(session.getState().draft.values.categoryId).toBe('cat-place')
    h.compress.resolve(image)
    await flush()
    expect(h.requests[0]?.placeKey).toBe('w3gv2c1')
    expect(session.savePayload().placeKey).toBe('w3gv2c1')
  })

  it('sends Decision without a place key when location is slow', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot({
        features: { suggestions: true, ruleLearning: true, location: true, decision: true },
      }),
    })
    session.start()
    h.compress.resolve(image)
    await flush()
    expect(h.deps.requestDecision).not.toHaveBeenCalled()
    await h.advance(PLACE_KEY_TIMEOUT_MS)
    expect(h.requests[0]?.placeKey).toBeNull()
  })

  it('re-runs merchant rules when the user types a merchant', async () => {
    const h = harness()
    const session = createSuggestionSession(h.deps, {
      generation: 1,
      imageUri: 'file:///photo.jpg',
      capturedAt,
      snapshot: snapshot({
        rules: [
          {
            ...parkingRule,
            id: 'rule-coffee',
            conditions: { merchantKey: 'highlands coffee' },
            actions: { categoryId: 'cat-drink' },
          },
        ],
      }),
    })
    session.start()
    session.edit('merchant', 'Highlands Coffee')
    expect(session.getState().draft.suggestions.categoryId?.[0]?.value).toBe('cat-drink')
  })
})

describe('createSessionRegistry', () => {
  it('does not start any work until the session is started', () => {
    const h = harness()
    const registry = createSessionRegistry(h.deps)
    const session = registry.create({
      imageUri: 'file:///a.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    expect(session.getState().branches).toEqual({
      ocr: 'idle',
      decision: 'idle',
      location: 'idle',
    })
    expect(h.deps.recognizeText).not.toHaveBeenCalled()
    expect(h.deps.compressImage).not.toHaveBeenCalled()

    session.start()
    expect(h.deps.recognizeText).toHaveBeenCalledOnce()
    expect(h.deps.compressImage).toHaveBeenCalledOnce()
  })

  it('never starts a session that was already cancelled', () => {
    const h = harness()
    const registry = createSessionRegistry(h.deps)
    const session = registry.create({
      imageUri: 'file:///a.jpg',
      capturedAt,
      snapshot: snapshot(),
    })
    session.cancel()
    session.start()
    expect(h.deps.recognizeText).not.toHaveBeenCalled()
    expect(h.deps.compressImage).not.toHaveBeenCalled()
  })

  it('gives each photo a new generation and cancels the previous session', () => {
    const h = harness()
    const registry = createSessionRegistry(h.deps)
    const first = registry.create({ imageUri: 'file:///a.jpg', capturedAt, snapshot: snapshot() })
    const second = registry.create({ imageUri: 'file:///b.jpg', capturedAt, snapshot: snapshot() })
    expect(second.generation).toBe(first.generation + 1)
    expect(first.getState().status).toBe('cancelled')
    expect(registry.get(first.generation)).toBeNull()
    expect(registry.get(second.generation)).toBe(second)
    registry.cancelAll()
    expect(second.getState().status).toBe('cancelled')
    expect(registry.get(second.generation)).toBeNull()
  })
})
