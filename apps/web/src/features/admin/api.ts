import { useCallback } from 'react'
import { useWebSession } from '@/features/auth/session'

const API_BASE_URL = import.meta.env.VITE_BILLET_API_BASE_URL || '/api/v1'

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

type RequestOptions = { method?: 'GET' | 'PATCH' | 'POST'; json?: unknown; form?: FormData }

async function send(path: string, token: string | null, options: RequestOptions = {}) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.json !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${API_BASE_URL}/admin${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.form ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new AdminApiError(response.status, errorMessage(response.status, payload))
  }
  return response
}

/** Requests to the admin API with the current session's bearer token. */
export function useAdminRequest() {
  const { token } = useWebSession()
  return useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
      const response = await send(path, token, options)
      return response.json() as Promise<T>
    },
    [token],
  )
}

/** Downloads a private file from the admin API; an `<img>` cannot send the bearer token. */
export function useAdminBlobRequest() {
  const { token } = useWebSession()
  return useCallback(
    async (path: string): Promise<Blob> => (await send(path, token)).blob(),
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

function errorMessage(status: number, payload: unknown): string {
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
  if (status === 403) return 'Tài khoản này không có quyền quản trị.'
  if (status === 409)
    return 'Dữ liệu vừa được người khác thay đổi. Đã tải lại bản mới, hãy thử lại.'
  if (status === 429) return 'Đã đạt giới hạn số lần thử trong một phút. Hãy đợi rồi thử lại.'
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join('\n')
  }
  return `Yêu cầu thất bại (${status})`
}
