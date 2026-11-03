import type { DecisionInput } from '../interface'

export const sampleInput: DecisionInput = {
  image: { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), mimeType: 'image/jpeg' },
  choices: {
    imageTypes: [
      { ref: 't1', label: 'Receipt' },
      { ref: 't2', label: 'Food' },
    ],
    categories: [{ ref: 'c1', label: 'Eating out' }],
    personal: [{ ref: 'p1', label: 'Parking' }],
  },
  locale: 'vi',
}

export const validDecision = {
  imageType: { ref: 't1', confidence: 0.9 },
  category: { ref: 'c1', confidence: 0.6 },
  personal: null,
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export interface RecordedRequest {
  url: string
  headers: Record<string, string>
  body: unknown
  signal: AbortSignal | null | undefined
}

/** Replace `fetch` with a scripted sequence of responses and record each request. */
export function mockFetch(
  responses: (Response | Error | ((signal: AbortSignal) => Promise<Response>))[],
): { requests: RecordedRequest[]; restore: () => void } {
  const requests: RecordedRequest[] = []
  const original = globalThis.fetch
  let index = 0
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    requests.push({
      url: String(url),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      signal: init?.signal,
    })
    const next = responses[Math.min(index++, responses.length - 1)]
    if (next instanceof Error) throw next
    if (typeof next === 'function') return next(init?.signal as AbortSignal)
    return next.clone()
  }) as typeof fetch
  return {
    requests,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

/** A fetch that never resolves until its signal aborts, then rejects like the real one. */
export function hangingResponse(signal: AbortSignal): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    const abort = () => reject(new DOMException('This operation was aborted', 'AbortError'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}
