import { Readable } from 'node:stream'
import type { RecognitionConfig } from '../../../configs/app.config'
import type { MediaService } from '../../media/service'
import { RecognitionRateLimitError } from '../interface'
import { GoogleAiStudioRecognitionProvider, normalizeSuggestion } from './google-ai-studio.provider'
import { RecognitionQuotaGuard } from './quota.guard'

describe('GoogleAiStudioRecognitionProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('sends the owned image and returns a normalized suggestion', async () => {
    const data = Buffer.from('receipt')
    const media = {
      open: jest.fn().mockResolvedValue({
        stream: Readable.from(data),
        mimeType: 'image/jpeg',
        size: data.length,
      }),
    } as unknown as MediaService
    const config = {
      provider: 'google-ai-studio',
      googleAiStudioApiKeys: ['secret-key'],
      googleAiStudioModel: 'gemini-test',
      timeoutMs: 10_000,
      requestsPerMinute: 10,
      tokensPerMinute: 250_000,
      requestsPerDay: 250,
      estimatedTokensPerRequest: 4_096,
    } as RecognitionConfig
    const quota = new RecognitionQuotaGuard(config)
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      amountMinor: '125000',
                      currency: 'vnd',
                      merchant: '  Quán ăn  ',
                      categoryCode: 'food',
                      confidence: { amountMinor: 0.98 },
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const result = await new GoogleAiStudioRecognitionProvider(media, config, quota).recognize(
      '7',
      '8',
    )

    expect(media.open).toHaveBeenCalledWith('7', '8')
    expect(result).toEqual({
      amountMinor: '125000',
      currency: 'VND',
      merchant: 'Quán ăn',
      categoryCode: 'food',
      confidence: { amountMinor: 0.98 },
    })
    const [url, request] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    )
    expect(request?.headers).toEqual(expect.objectContaining({ 'x-goog-api-key': 'secret-key' }))
    expect(String(request?.body)).toContain(data.toString('base64'))
  })

  it('does not include a provider response body in an HTTP error', async () => {
    const media = {
      open: jest.fn().mockImplementation(async () => ({
        stream: Readable.from(Buffer.from('x')),
        mimeType: 'image/png',
        size: 1,
      })),
    } as unknown as MediaService
    const config = {
      provider: 'google-ai-studio',
      googleAiStudioApiKeys: ['secret-key'],
      googleAiStudioModel: 'gemini-test',
      timeoutMs: 10_000,
      requestsPerMinute: 10,
      tokensPerMinute: 250_000,
      requestsPerDay: 250,
      estimatedTokensPerRequest: 4_096,
    } as RecognitionConfig
    const quota = new RecognitionQuotaGuard(config)
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('sensitive upstream details', { status: 500 }))

    await expect(
      new GoogleAiStudioRecognitionProvider(media, config, quota).recognize('7', '8'),
    ).rejects.toThrow('Google AI Studio request failed with status 500')
  })

  it('uses API keys in round-robin order', async () => {
    const media = {
      open: jest.fn().mockImplementation(async () => ({
        stream: Readable.from(Buffer.from('x')),
        mimeType: 'image/png',
        size: 1,
      })),
    } as unknown as MediaService
    const config = {
      provider: 'google-ai-studio',
      googleAiStudioApiKeys: ['key-1', 'key-2'],
      googleAiStudioModel: 'gemini-test',
      timeoutMs: 10_000,
      requestsPerMinute: 10,
      tokensPerMinute: 250_000,
      requestsPerDay: 250,
      estimatedTokensPerRequest: 4_096,
    } as RecognitionConfig
    const response = () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"confidence":{}}' }] } }],
        }),
        { status: 200 },
      )
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => response())
    const provider = new GoogleAiStudioRecognitionProvider(
      media,
      config,
      new RecognitionQuotaGuard(config),
    )

    await provider.recognize('7', '8')
    await provider.recognize('7', '8')
    await provider.recognize('7', '8')

    expect(fetchMock.mock.calls.map(([, request]) => request?.headers)).toEqual([
      expect.objectContaining({ 'x-goog-api-key': 'key-1' }),
      expect.objectContaining({ 'x-goog-api-key': 'key-2' }),
      expect.objectContaining({ 'x-goog-api-key': 'key-1' }),
    ])
  })

  it('does not call the provider when the aggregate key-pool quota is exhausted', async () => {
    const media = {
      open: jest.fn().mockResolvedValue({
        stream: Readable.from(Buffer.from('x')),
        mimeType: 'image/png',
        size: 1,
      }),
    } as unknown as MediaService
    const config = {
      provider: 'google-ai-studio',
      googleAiStudioApiKeys: ['key-1', 'key-2'],
      googleAiStudioModel: 'gemini-test',
      timeoutMs: 10_000,
      requestsPerMinute: 1,
      tokensPerMinute: 250_000,
      requestsPerDay: 250,
      estimatedTokensPerRequest: 4_096,
    } as RecognitionConfig
    const quota = new RecognitionQuotaGuard(config)
    quota.acquire()
    const fetchMock = jest.spyOn(globalThis, 'fetch')

    await expect(
      new GoogleAiStudioRecognitionProvider(media, config, quota).recognize('7', '8'),
    ).rejects.toBeInstanceOf(RecognitionRateLimitError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('normalizeSuggestion', () => {
  it('rejects unsupported categories and invalid confidence values', () => {
    expect(() =>
      normalizeSuggestion({ categoryCode: 'travel', confidence: { categoryCode: 0.8 } }),
    ).toThrow('categoryCode is not supported')
    expect(() => normalizeSuggestion({ confidence: { amountMinor: 2 } })).toThrow(
      'confidence.amountMinor must be between 0 and 1',
    )
  })
})
