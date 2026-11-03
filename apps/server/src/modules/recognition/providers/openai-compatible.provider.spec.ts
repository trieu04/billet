import { DecisionProviderError } from '../interface'
import { OpenAiCompatibleDecisionProvider } from './openai-compatible.provider'
import {
  hangingResponse,
  jsonResponse,
  mockFetch,
  sampleInput,
  validDecision,
} from './test-support'

function completion(content: unknown, usage?: Record<string, number>): Response {
  return jsonResponse({ choices: [{ message: { content } }], usage })
}

function provider(): OpenAiCompatibleDecisionProvider {
  return new OpenAiCompatibleDecisionProvider({
    model: 'vision-test',
    baseUrl: 'https://gateway.example.test/v1/',
    apiKey: 'secret-key',
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

describe('OpenAiCompatibleDecisionProvider', () => {
  let restore: () => void = () => undefined
  afterEach(() => restore())

  it('posts a chat completion with a data URI image and JSON output, and returns usage', async () => {
    const mock = mockFetch([
      completion(JSON.stringify(validDecision), {
        prompt_tokens: 500,
        completion_tokens: 30,
        cost: 0.00042,
      }),
    ])
    restore = mock.restore
    const controller = new AbortController()

    const output = await provider().decide(sampleInput, controller.signal)

    expect(output).toEqual({
      ...validDecision,
      usage: { inputTokens: 500, outputTokens: 30, costMicroUsd: 420 },
    })
    const [request] = mock.requests
    expect(request.url).toBe('https://gateway.example.test/v1/chat/completions')
    expect(request.headers.authorization).toBe('Bearer secret-key')
    expect(request.signal).toBe(controller.signal)
    const body = request.body as {
      model: string
      reasoning_effort: string
      response_format: { type: string }
      messages: { role: string; content: unknown }[]
    }
    expect(body.model).toBe('vision-test')
    expect(body.reasoning_effort).toBe('none')
    expect(body.response_format).toEqual({ type: 'json_object' })
    const userContent = body.messages[1].content as {
      type: string
      text?: string
      image_url?: { url: string }
    }[]
    expect(userContent[0].text).toContain('- t2: Food')
    expect(userContent[1].image_url?.url).toBe(
      `data:image/jpeg;base64,${Buffer.from(sampleInput.image.bytes).toString('base64')}`,
    )
  })

  it('accepts content given as text parts and a fenced JSON reply', async () => {
    const mock = mockFetch([
      completion([{ type: 'text', text: `\`\`\`json\n${JSON.stringify(validDecision)}\n\`\`\`` }]),
    ])
    restore = mock.restore
    const output = await provider().decide(sampleInput, new AbortController().signal)
    expect(output.imageType.ref).toBe('t1')
    expect(output.usage).toBeUndefined()
  })

  it('maps 429 to provider_rate_limited and other statuses to provider_error', async () => {
    const limited = mockFetch([jsonResponse({}, 429)])
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('provider_rate_limited')
    limited.restore()

    const broken = mockFetch([jsonResponse({}, 503)])
    restore = broken.restore
    await expect(
      reasonOf(provider().decide(sampleInput, new AbortController().signal)),
    ).resolves.toBe('provider_error')
  })

  it.each([
    ['text that is not JSON', completion('hello')],
    ['ill-typed JSON', completion('{"imageType":{"ref":"t1"}}')],
    ['empty choices', jsonResponse({ choices: [] })],
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

  it('maps a signal timeout to timeout', async () => {
    const mock = mockFetch([hangingResponse])
    restore = mock.restore
    await expect(reasonOf(provider().decide(sampleInput, AbortSignal.timeout(20)))).resolves.toBe(
      'timeout',
    )
  })
})
