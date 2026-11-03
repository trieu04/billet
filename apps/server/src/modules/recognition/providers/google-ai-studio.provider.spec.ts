import { DecisionProviderError } from '../interface'
import { GoogleAiStudioDecisionProvider } from './google-ai-studio.provider'
import {
  hangingResponse,
  jsonResponse,
  mockFetch,
  sampleInput,
  validDecision,
} from './test-support'

function geminiResponse(text: string, usage?: Record<string, number>): Response {
  return jsonResponse({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: usage,
  })
}

function provider(keys = ['key-a', 'key-b']): GoogleAiStudioDecisionProvider {
  return new GoogleAiStudioDecisionProvider({
    model: 'gemini-test',
    apiKeys: keys,
    maxImageBytes: 1_048_576,
    maxChoices: 64,
  })
}

async function reasonOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
  } catch (error: unknown) {
    if (error instanceof DecisionProviderError) return error.reason
    throw error
  }
  return undefined
}

describe('GoogleAiStudioDecisionProvider', () => {
  let restore: () => void = () => undefined
  afterEach(() => restore())

  it('sends the inline JPEG with a JSON schema and returns the parsed decision and usage', async () => {
    const mock = mockFetch([
      geminiResponse(JSON.stringify(validDecision), {
        promptTokenCount: 320,
        candidatesTokenCount: 24,
      }),
    ])
    restore = mock.restore
    const controller = new AbortController()

    const output = await provider().decide(sampleInput, controller.signal)

    expect(output).toEqual({
      ...validDecision,
      usage: { inputTokens: 320, outputTokens: 24 },
    })
    const [request] = mock.requests
    expect(request.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    )
    expect(request.url).not.toContain('key-')
    expect(request.headers['x-goog-api-key']).toBe('key-a')
    expect(request.signal).toBe(controller.signal)
    const body = request.body as {
      contents: { parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[]
      generationConfig: { responseMimeType: string; responseJsonSchema: unknown }
    }
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.generationConfig.responseJsonSchema).toBeDefined()
    const parts = body.contents[0].parts
    expect(parts[0].text).toContain('- c1: Eating out')
    expect(parts[1].inlineData).toEqual({
      mimeType: 'image/jpeg',
      data: Buffer.from(sampleInput.image.bytes).toString('base64'),
    })
  })

  it('rotates keys across requests', async () => {
    const mock = mockFetch([geminiResponse(JSON.stringify(validDecision))])
    restore = mock.restore
    const subject = provider()
    const signal = new AbortController().signal
    await subject.decide(sampleInput, signal)
    await subject.decide(sampleInput, signal)
    await subject.decide(sampleInput, signal)
    expect(mock.requests.map((request) => request.headers['x-goog-api-key'])).toEqual([
      'key-a',
      'key-b',
      'key-a',
    ])
  })

  it('moves to the next key on 429', async () => {
    const mock = mockFetch([jsonResponse({}, 429), geminiResponse(JSON.stringify(validDecision))])
    restore = mock.restore

    const output = await provider().decide(sampleInput, new AbortController().signal)

    expect(output.imageType.ref).toBe('t1')
    expect(mock.requests.map((request) => request.headers['x-goog-api-key'])).toEqual([
      'key-a',
      'key-b',
    ])
  })

  it('maps 429 on every key to provider_rate_limited', async () => {
    const mock = mockFetch([jsonResponse({}, 429)])
    restore = mock.restore
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('provider_rate_limited')
    expect(mock.requests).toHaveLength(2)
  })

  it('maps other non-2xx responses to provider_error without trying other keys', async () => {
    const mock = mockFetch([jsonResponse({ error: 'boom' }, 500)])
    restore = mock.restore
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('provider_error')
    expect(mock.requests).toHaveLength(1)
  })

  it('maps network failures to provider_error', async () => {
    const mock = mockFetch([new TypeError('fetch failed')])
    restore = mock.restore
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('provider_error')
  })

  it.each([
    ['text that is not JSON', geminiResponse('nope')],
    [
      'ill-typed JSON',
      geminiResponse(JSON.stringify({ imageType: { ref: 't1', confidence: 'high' } })),
    ],
    ['no candidates', jsonResponse({ candidates: [] })],
    ['a non-JSON body', new Response('<html>', { status: 200 })],
  ])('maps %s to invalid_output', async (_name, response) => {
    const mock = mockFetch([response])
    restore = mock.restore
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('invalid_output')
  })

  it('maps an abort during the request to timeout', async () => {
    const mock = mockFetch([hangingResponse])
    restore = mock.restore
    const controller = new AbortController()
    const pending = reasonOf(provider().decide(sampleInput, controller.signal))
    controller.abort()
    await expect(pending).resolves.toBe('timeout')
  })

  it('does not call the provider when the signal is already aborted', async () => {
    const mock = mockFetch([geminiResponse(JSON.stringify(validDecision))])
    restore = mock.restore
    await expect(reasonOf(provider().decide(sampleInput, AbortSignal.abort()))).resolves.toBe(
      'timeout',
    )
    expect(mock.requests).toHaveLength(0)
  })
})
