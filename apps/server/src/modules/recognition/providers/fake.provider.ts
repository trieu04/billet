import { createHash } from 'node:crypto'
import {
  DecisionProviderError,
  DECISION_MAX_CHOICES,
  type DecisionChoice,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
} from '../interface'

export interface FakeDecisionOptions {
  maxImageBytes: number
  model?: string
  /** Simulated provider latency; defaults to 0. */
  latencyMs?: number
  /** Fixed output, or a function of the input. Defaults to {@link deterministicDecision}. */
  output?: DecisionOutput | ((input: DecisionInput) => DecisionOutput)
  /** Fail with this error after the latency instead of returning an output. */
  error?: DecisionProviderError
}

/** Test and benchmark adapter: configurable latency and output, honors `AbortSignal`. */
export class FakeDecisionProvider implements DecisionProvider {
  readonly id = 'fake'
  readonly model: string
  readonly limits: DecisionProvider['limits']
  readonly calls: DecisionInput[] = []

  constructor(private readonly options: FakeDecisionOptions) {
    this.model = options.model ?? 'fake'
    this.limits = { maxImageBytes: options.maxImageBytes, maxChoices: DECISION_MAX_CHOICES }
  }

  async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionOutput> {
    this.calls.push(input)
    await delay(this.options.latencyMs ?? 0, signal)
    if (this.options.error) throw this.options.error
    const { output } = this.options
    if (typeof output === 'function') return output(input)
    return output ?? deterministicDecision(input)
  }
}

/**
 * Pick one choice per list from a hash of the image bytes: stable for a given image, varied
 * across images, with confidence derived from the same hash. Null when a list is empty.
 */
export function deterministicDecision(input: DecisionInput): DecisionOutput {
  const digest = createHash('sha256').update(input.image.bytes).digest()
  const pick = (choices: readonly DecisionChoice[], offset: number) => {
    if (choices.length === 0) return null
    return {
      ref: choices[digest[offset] % choices.length].ref,
      confidence: Math.round((0.5 + (digest[offset + 1] / 255) * 0.5) * 100) / 100,
    }
  }
  const imageType = pick(input.choices.imageTypes, 0)
  if (!imageType) throw new DecisionProviderError('invalid_output', 'No image types offered')
  return {
    imageType,
    category: pick(input.choices.categories, 2),
    personal: pick(input.choices.personal, 4),
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(timeoutError())
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(timeoutError())
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function timeoutError(): DecisionProviderError {
  return new DecisionProviderError('timeout', 'Fake decision provider was aborted')
}
