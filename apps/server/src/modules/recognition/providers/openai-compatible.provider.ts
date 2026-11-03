import { parseDecisionText } from '../decision-output'
import {
  DecisionProviderError,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
  type DecisionUsage,
} from '../interface'
import { isRecord, optionalNumber, postJson, toBase64 } from './http'
import { buildDecisionPrompt, DECISION_SYSTEM_INSTRUCTION } from './prompt'

export interface OpenAiCompatibleOptions {
  model: string
  baseUrl: string
  apiKey: string
  maxImageBytes: number
  maxChoices: number
}

/**
 * Chat Completions adapter for OpenAI-compatible gateways: image as a `data:` URI in an
 * `image_url` part and `json_object` response format (the broadest-supported JSON mode; the
 * schema is described in the prompt and verified by {@link parseDecisionText}).
 */
export class OpenAiCompatibleDecisionProvider implements DecisionProvider {
  readonly id = 'openai-compatible'
  readonly model: string
  readonly limits: DecisionProvider['limits']
  private readonly endpoint: string
  private readonly apiKey: string

  constructor(options: OpenAiCompatibleOptions) {
    this.model = options.model
    this.limits = { maxImageBytes: options.maxImageBytes, maxChoices: options.maxChoices }
    this.endpoint = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`
    this.apiKey = options.apiKey
  }

  async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionOutput> {
    const dataUri = `data:${input.image.mimeType};base64,${toBase64(input.image.bytes)}`
    const payload = await postJson({
      url: this.endpoint,
      headers: { authorization: `Bearer ${this.apiKey}` },
      signal,
      body: {
        model: this.model,
        reasoning_effort: 'none',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: DECISION_SYSTEM_INSTRUCTION },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildDecisionPrompt(input) },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      },
    })

    const text = extractText(payload)
    if (text === undefined) {
      throw new DecisionProviderError('invalid_output', 'Provider returned no decision text')
    }
    return { ...parseDecisionText(text), usage: extractUsage(payload) }
  }
}

function extractText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return undefined
  const choice: unknown = payload.choices[0]
  if (!isRecord(choice) || !isRecord(choice.message)) return undefined
  const content: unknown = choice.message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const part of content) {
      if (isRecord(part) && typeof part.text === 'string') return part.text
    }
  }
  return undefined
}

function extractUsage(payload: unknown): DecisionUsage | undefined {
  if (!isRecord(payload) || !isRecord(payload.usage)) return undefined
  const inputTokens = optionalNumber(payload.usage.prompt_tokens)
  const outputTokens = optionalNumber(payload.usage.completion_tokens)
  // Some gateways report the request cost in USD as `usage.cost`.
  const cost = optionalNumber(payload.usage.cost)
  const costMicroUsd = cost === undefined ? undefined : Math.round(cost * 1_000_000)
  if (inputTokens === undefined && outputTokens === undefined && costMicroUsd === undefined) {
    return undefined
  }
  return { inputTokens, outputTokens, costMicroUsd }
}
