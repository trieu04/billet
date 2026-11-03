import { DecisionProviderError } from '../interface'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64')
}

export interface PostJsonRequest {
  url: string
  headers: Record<string, string>
  body: unknown
  signal: AbortSignal
}

/**
 * POST a JSON body and return the parsed JSON response. Normalizes failures:
 * abort/timeout -> `timeout`, 429 -> `provider_rate_limited`, other non-2xx or network
 * failure -> `provider_error`, unparsable body -> `invalid_output`. Error messages carry only
 * the status code, never request or response content.
 */
export async function postJson(request: PostJsonRequest): Promise<unknown> {
  if (request.signal.aborted) throw timeoutError()

  let response: Response
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...request.headers },
      body: JSON.stringify(request.body),
      signal: request.signal,
    })
  } catch (error: unknown) {
    if (request.signal.aborted || isAbortError(error)) throw timeoutError(error)
    throw new DecisionProviderError('provider_error', 'Decision provider request failed', {
      cause: error,
    })
  }

  if (response.status === 429) {
    discardBody(response)
    throw new DecisionProviderError('provider_rate_limited', 'Decision provider rate limited')
  }
  if (!response.ok) {
    discardBody(response)
    throw new DecisionProviderError(
      'provider_error',
      `Decision provider returned HTTP ${response.status}`,
    )
  }

  try {
    return (await response.json()) as unknown
  } catch (error: unknown) {
    if (request.signal.aborted || isAbortError(error)) throw timeoutError(error)
    throw new DecisionProviderError('invalid_output', 'Decision provider returned invalid JSON', {
      cause: error,
    })
  }
}

function timeoutError(cause?: unknown): DecisionProviderError {
  return new DecisionProviderError('timeout', 'Decision provider request timed out', { cause })
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

/** Release the connection without waiting for the rest of an unneeded body. */
function discardBody(response: Response): void {
  response.body?.cancel().catch(() => undefined)
}
