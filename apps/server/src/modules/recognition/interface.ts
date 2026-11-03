export const DECISION_PROVIDER = Symbol('DECISION_PROVIDER')

/** Upper bound on the number of choices (image types + categories + personal) in one request. */
export const DECISION_MAX_CHOICES = 64

export interface DecisionChoice {
  /** Short request-scoped code such as `t3`, `c12`, or `p4`. */
  ref: string
  label: string
  description?: string
}

export interface DecisionInput {
  image: { bytes: Uint8Array; mimeType: 'image/jpeg' }
  choices: {
    imageTypes: readonly DecisionChoice[]
    categories: readonly DecisionChoice[]
    personal: readonly DecisionChoice[]
  }
  locale: string
}

export interface DecisionUsage {
  inputTokens?: number
  outputTokens?: number
  costMicroUsd?: number
}

export interface DecisionOutput {
  imageType: { ref: string; confidence: number }
  category: { ref: string; confidence: number } | null
  personal: { ref: string; confidence: number } | null
  usage?: DecisionUsage
}

export interface DecisionProvider {
  /** Adapter or model-family identifier. Intentionally open so new adapters need no type change. */
  readonly id: string
  readonly model: string
  readonly limits: { maxImageBytes: number; maxChoices: number }
  decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionOutput>
}

export type DecisionProviderErrorReason =
  | 'timeout'
  | 'provider_rate_limited'
  | 'provider_error'
  | 'invalid_output'
  | 'disabled'

/**
 * Normalized failure of a decision provider. Messages never contain images, choice labels,
 * credentials, or raw provider output.
 */
export class DecisionProviderError extends Error {
  constructor(
    readonly reason: DecisionProviderErrorReason,
    message?: string,
    options?: { cause?: unknown },
  ) {
    super(message ?? `Decision provider failed: ${reason}`, options)
    this.name = 'DecisionProviderError'
  }
}
