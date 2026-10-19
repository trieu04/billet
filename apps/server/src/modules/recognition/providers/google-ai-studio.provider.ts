import { Inject, Injectable } from '@nestjs/common'
import { recognitionConfig, type RecognitionConfig } from '../../../configs/app.config'
import { MediaService } from '../../media/service'
import type { RecognitionSuggestion } from '../entities/recognition-job.entity'
import type { RecognitionProvider } from '../interface'
import { RecognitionRateLimitError } from '../interface'
import { RecognitionQuotaGuard } from './quota.guard'

const CATEGORY_CODES = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'health',
  'education',
  'other',
] as const

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['confidence'],
  properties: {
    amountMinor: {
      type: 'string',
      description: 'Positive integer amount in the currency minor unit, without separators.',
      pattern: '^[1-9][0-9]*$',
    },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    merchant: { type: 'string' },
    occurredAt: {
      type: 'string',
      description: 'ISO 8601 date-time including an explicit UTC offset.',
    },
    categoryCode: { type: 'string', enum: CATEGORY_CODES },
    confidence: {
      type: 'object',
      additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
      properties: {
        amountMinor: { type: 'number', minimum: 0, maximum: 1 },
        currency: { type: 'number', minimum: 0, maximum: 1 },
        merchant: { type: 'number', minimum: 0, maximum: 1 },
        occurredAt: { type: 'number', minimum: 0, maximum: 1 },
        categoryCode: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
} as const

@Injectable()
export class GoogleAiStudioRecognitionProvider implements RecognitionProvider {
  readonly name = 'google-ai-studio'
  private nextKeyIndex = 0

  constructor(
    private readonly media: MediaService,
    @Inject(recognitionConfig.KEY) private readonly config: RecognitionConfig,
    private readonly quota: RecognitionQuotaGuard,
  ) {}

  async recognize(userId: string, mediaAssetId: string): Promise<RecognitionSuggestion> {
    const image = await this.media.open(userId, mediaAssetId)
    const data = await readStream(image.stream, image.size)
    const reservation = this.quota.acquire()
    const apiKey = this.nextApiKey()
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Read this expense receipt. Return only fields supported by the schema. Do not guess fields that are not visible. Use the receipt currency and local date/time with an explicit offset when printed. Classify categoryCode using the supplied enum.',
              },
              { inlineData: { mimeType: image.mimeType, data: data.toString('base64') } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))
        throw new RecognitionRateLimitError(retryAfterMs)
      }
      throw new Error(`Google AI Studio request failed with status ${response.status}`)
    }

    const payload: unknown = await response.json()
    this.quota.reconcile(reservation, extractTokenCount(payload))
    const text = extractResponseText(payload)
    if (!text) throw new Error('Google AI Studio returned no recognition result')

    try {
      return normalizeSuggestion(JSON.parse(text) as unknown)
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('Invalid recognition result:')) {
        throw error
      }
      throw new Error('Invalid recognition result: response was not valid JSON')
    }
  }

  private endpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.googleAiStudioModel)}:generateContent`
  }

  private nextApiKey(): string {
    const keys = this.config.googleAiStudioApiKeys
    const key = keys[this.nextKeyIndex]
    this.nextKeyIndex = (this.nextKeyIndex + 1) % keys.length
    return key
  }
}

function extractTokenCount(payload: unknown): number | undefined {
  if (!isRecord(payload) || !isRecord(payload.usageMetadata)) return undefined
  const value = payload.usageMetadata.totalTokenCount
  return typeof value === 'number' ? value : undefined
}

function parseRetryAfter(value: string | null): number {
  if (!value) return 60_000
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1_000, seconds * 1_000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? 60_000 : Math.max(1_000, date - Date.now())
}

function extractResponseText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) return undefined
  const candidate = payload.candidates[0]
  if (
    !isRecord(candidate) ||
    !isRecord(candidate.content) ||
    !Array.isArray(candidate.content.parts)
  )
    return undefined
  const part = candidate.content.parts.find(
    (value): value is Record<string, unknown> => isRecord(value) && typeof value.text === 'string',
  )
  return typeof part?.text === 'string' ? part.text : undefined
}

export function normalizeSuggestion(value: unknown): RecognitionSuggestion {
  if (!isRecord(value)) throw invalid('result must be an object')
  const suggestion: RecognitionSuggestion = { confidence: normalizeConfidence(value.confidence) }

  if (value.amountMinor !== undefined) {
    if (typeof value.amountMinor !== 'string' || !/^[1-9]\d*$/.test(value.amountMinor))
      throw invalid('amountMinor must be a positive integer string')
    suggestion.amountMinor = value.amountMinor
  }
  if (value.currency !== undefined) {
    if (typeof value.currency !== 'string' || !/^[A-Za-z]{3}$/.test(value.currency))
      throw invalid('currency must be a three-letter code')
    suggestion.currency = value.currency.toUpperCase()
  }
  if (value.merchant !== undefined) {
    if (typeof value.merchant !== 'string' || value.merchant.trim().length === 0)
      throw invalid('merchant must be a non-empty string')
    suggestion.merchant = value.merchant.trim().slice(0, 200)
  }
  if (value.occurredAt !== undefined) {
    if (
      typeof value.occurredAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value.occurredAt,
      ) ||
      Number.isNaN(Date.parse(value.occurredAt))
    )
      throw invalid('occurredAt must be an ISO 8601 date-time with an offset')
    suggestion.occurredAt = value.occurredAt
  }
  if (value.categoryCode !== undefined) {
    if (
      typeof value.categoryCode !== 'string' ||
      !CATEGORY_CODES.includes(value.categoryCode as (typeof CATEGORY_CODES)[number])
    )
      throw invalid('categoryCode is not supported')
    suggestion.categoryCode = value.categoryCode
  }

  return suggestion
}

function normalizeConfidence(value: unknown): Record<string, number> {
  if (!isRecord(value)) throw invalid('confidence must be an object')
  const confidence: Record<string, number> = {}
  for (const [key, score] of Object.entries(value)) {
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1)
      throw invalid(`confidence.${key} must be between 0 and 1`)
    confidence[key] = score
  }
  return confidence
}

async function readStream(stream: AsyncIterable<unknown>, expectedSize: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    size += buffer.length
    if (size > expectedSize || size > 15_000_000)
      throw new Error('Receipt image exceeded its declared size')
    chunks.push(buffer)
  }
  if (size !== expectedSize) throw new Error('Receipt image did not match its declared size')
  return Buffer.concat(chunks)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): Error {
  return new Error(`Invalid recognition result: ${message}`)
}
