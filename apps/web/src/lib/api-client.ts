import { useCallback } from 'react'
import { useWebSession } from '@/features/auth/session'

export const API_BASE_URL = import.meta.env.VITE_BILLET_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type RequestOptions = {
  method?: 'GET' | 'PATCH' | 'POST' | 'PUT' | 'DELETE'
  json?: unknown
  form?: FormData
  /** Raw body, e.g. image bytes for a media upload. */
  body?: Blob
  headers?: Record<string, string>
}

/** Messages shown for failures every authenticated endpoint can produce. */
export function describeApiError(status: number, payload: unknown): string {
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 409) return 'Dữ liệu vừa được thay đổi ở nơi khác. Hãy tải lại rồi thử lại.'
  if (status === 413) return 'Tệp quá lớn.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Hãy đợi một chút rồi thử lại.'
  const message =
    payload && typeof payload === 'object' && 'message' in payload ? payload.message : null
  if (typeof message === 'string') return message
  if (Array.isArray(message)) return message.join('\n')
  return `Yêu cầu thất bại (${status})`
}

/** Sends one request with a bearer token; a `204` resolves to `undefined`. */
export async function apiFetch<T>(
  token: string | null,
  path: string,
  options: RequestOptions = {},
  describe: (status: number, payload: unknown) => string = describeApiError,
): Promise<T> {
  const headers: Record<string, string> = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.json !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.form ??
      options.body ??
      (options.json === undefined ? undefined : JSON.stringify(options.json)),
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, describe(response.status, payload))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

/** Requests to the Billet API as the signed-in user. */
export function useApi() {
  const { token } = useWebSession()
  return useCallback(
    <T>(path: string, options?: RequestOptions) => apiFetch<T>(token, path, options),
    [token],
  )
}

/** Downloads a private binary resource (e.g. a media asset) with the user's token. */
export function useBlobFetcher() {
  const { token } = useWebSession()
  return useCallback(
    async (path: string): Promise<Blob> => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new ApiError(response.status, describeApiError(response.status, null))
      return response.blob()
    },
    [token],
  )
}

export function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(key, String(value))
  const text = params.toString()
  return text ? `?${text}` : ''
}
