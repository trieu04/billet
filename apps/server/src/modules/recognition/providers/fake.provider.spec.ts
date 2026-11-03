import { DecisionProviderError, type DecisionOutput } from '../interface'
import { assertDecisionRefs } from '../decision-output'
import { DisabledDecisionProvider } from './disabled.provider'
import { deterministicDecision, FakeDecisionProvider } from './fake.provider'
import { sampleInput } from './test-support'

const fixed: DecisionOutput = {
  imageType: { ref: 't2', confidence: 0.7 },
  category: null,
  personal: null,
}

describe('FakeDecisionProvider', () => {
  it('returns the configured output and records calls', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 100, output: fixed })
    await expect(provider.decide(sampleInput, new AbortController().signal)).resolves.toBe(fixed)
    expect(provider.calls).toEqual([sampleInput])
  })

  it('supports an output function and a configured error', async () => {
    const fromInput = new FakeDecisionProvider({
      maxImageBytes: 100,
      output: (input) => ({
        ...fixed,
        imageType: { ref: input.choices.imageTypes[0].ref, confidence: 1 },
      }),
    })
    await expect(
      fromInput.decide(sampleInput, new AbortController().signal),
    ).resolves.toMatchObject({ imageType: { ref: 't1' } })

    const failing = new FakeDecisionProvider({
      maxImageBytes: 100,
      error: new DecisionProviderError('provider_error'),
    })
    await expect(failing.decide(sampleInput, new AbortController().signal)).rejects.toMatchObject({
      reason: 'provider_error',
    })
  })

  it('waits for the configured latency', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 100, latencyMs: 30, output: fixed })
    const started = Date.now()
    await provider.decide(sampleInput, new AbortController().signal)
    expect(Date.now() - started).toBeGreaterThanOrEqual(25)
  })

  it('aborts a slow call with reason timeout when the signal fires', async () => {
    const provider = new FakeDecisionProvider({
      maxImageBytes: 100,
      latencyMs: 10_000,
      output: fixed,
    })
    const controller = new AbortController()
    const pending = provider.decide(sampleInput, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ reason: 'timeout' })
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 100, output: fixed })
    await expect(provider.decide(sampleInput, AbortSignal.abort())).rejects.toMatchObject({
      reason: 'timeout',
    })
  })

  it('exposes limits', () => {
    expect(new FakeDecisionProvider({ maxImageBytes: 123 }).limits.maxImageBytes).toBe(123)
  })
})

describe('deterministicDecision', () => {
  it('is stable per image and only uses refs from the request', () => {
    const first = deterministicDecision(sampleInput)
    expect(deterministicDecision(sampleInput)).toEqual(first)
    expect(() => assertDecisionRefs(sampleInput.choices, first)).not.toThrow()
    expect(first.imageType.confidence).toBeGreaterThanOrEqual(0.5)
    expect(first.imageType.confidence).toBeLessThanOrEqual(1)
  })

  it('returns null for empty category and personal lists', () => {
    const output = deterministicDecision({
      ...sampleInput,
      choices: { ...sampleInput.choices, categories: [], personal: [] },
    })
    expect(output.category).toBeNull()
    expect(output.personal).toBeNull()
  })
})

describe('DisabledDecisionProvider', () => {
  it('always rejects with reason disabled', async () => {
    const provider = new DisabledDecisionProvider(100)
    await expect(provider.decide(sampleInput, new AbortController().signal)).rejects.toMatchObject({
      reason: 'disabled',
    })
    expect(provider.id).toBe('disabled')
  })
})
