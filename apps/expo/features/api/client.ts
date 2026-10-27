import { getExpoHostUri } from './runtime-host'
import { resolveApiBaseUrl, resolveApiUrl } from './url'

const configuredBaseUrl = process.env.EXPO_PUBLIC_BILLET_API_BASE_URL?.trim()

if (!configuredBaseUrl) {
  throw new Error('EXPO_PUBLIC_BILLET_API_BASE_URL is required')
}

export const API_BASE_URL = resolveApiBaseUrl(configuredBaseUrl, getExpoHostUri())

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown>
  token?: string | null
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  let body = options.body
  if (body && !(body instanceof Blob) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(resolveApiUrl(API_BASE_URL, path), { ...options, body, headers })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const message = getErrorMessage(payload) ?? `Yêu cầu thất bại (${response.status})`
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return null
  const message = payload.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('\n')
  }
  return null
}
