import { parseDecisionText } from '../decision-output'
import {
  DecisionProviderError,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
  type DecisionUsage,
} from '../interface'
import { isRecord, optionalNumber, postJson, toBase64 } from './http'
import { ApiKeyPool } from './key-pool'
import {
  buildDecisionPrompt,
  DECISION_RESPONSE_SCHEMA,
  DECISION_SYSTEM_INSTRUCTION,
} from './prompt'

const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export interface GoogleAiStudioOptions {
  model: string
  apiKeys: readonly string[]
  maxImageBytes: number
  maxChoices: number
  /** Overridable for tests. */
  baseUrl?: string
}

/**
 * Gemini `generateContent` adapter with an inline JPEG and a JSON response schema. Keys rotate
 * round-robin per request; a 429 moves the same request to the next key and only surfaces
 * `provider_rate_limited` once every key was rate limited.
 */
export class GoogleAiStudioDecisionProvider implements DecisionProvider {
  readonly id = 'google-ai-studio'
  readonly model: string
  readonly limits: DecisionProvider['limits']
  private readonly keys: ApiKeyPool
  private readonly baseUrl: string

  constructor(options: GoogleAiStudioOptions) {
    this.model = options.model
    this.limits = { maxImageBytes: options.maxImageBytes, maxChoices: options.maxChoices }
    this.keys = new ApiKeyPool(options.apiKeys)
    this.baseUrl = options.baseUrl ?? GOOGLE_API_BASE_URL
  }

  async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionOutput> {
    const body = {
      systemInstruction: { parts: [{ text: DECISION_SYSTEM_INSTRUCTION }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildDecisionPrompt(input) },
            { inlineData: { mimeType: input.image.mimeType, data: toBase64(input.image.bytes) } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: DECISION_RESPONSE_SCHEMA,
      },
    }

    const payload = await this.post(body, signal)
    const text = extractText(payload)
    if (text === undefined) {
      throw new DecisionProviderError('invalid_output', 'Provider returned no decision text')
    }
    return { ...parseDecisionText(text), usage: extractUsage(payload) }
  }

  private async post(body: unknown, signal: AbortSignal): Promise<unknown> {
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`
    let rateLimited: DecisionProviderError | undefined
    for (const apiKey of this.keys.order()) {
      try {
        return await postJson({ url, headers: { 'x-goog-api-key': apiKey }, body, signal })
      } catch (error: unknown) {
        if (error instanceof DecisionProviderError && error.reason === 'provider_rate_limited') {
          rateLimited = error
          continue
        }
        throw error
      }
    }
    throw rateLimited ?? new DecisionProviderError('provider_rate_limited')
  }
}

function extractText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) return undefined
  const candidate: unknown = payload.candidates[0]
  if (!isRecord(candidate) || !isRecord(candidate.content)) return undefined
  const parts: unknown = candidate.content.parts
  if (!Array.isArray(parts)) return undefined
  for (const part of parts) {
    if (isRecord(part) && part.thought !== true && typeof part.text === 'string') return part.text
  }
  return undefined
}

function extractUsage(payload: unknown): DecisionUsage | undefined {
  if (!isRecord(payload) || !isRecord(payload.usageMetadata)) return undefined
  const inputTokens = optionalNumber(payload.usageMetadata.promptTokenCount)
  const outputTokens = optionalNumber(payload.usageMetadata.candidatesTokenCount)
  if (inputTokens === undefined && outputTokens === undefined) return undefined
  return { inputTokens, outputTokens }
}
