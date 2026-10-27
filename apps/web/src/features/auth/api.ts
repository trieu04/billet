const API_BASE_URL = import.meta.env.VITE_BILLET_API_BASE_URL || '/api/v1'

export type User = { id: string; username: string; email: string; displayName: string }
export type AuthResponse = {
  accessToken: string
  refreshToken?: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
  requiresMfa: boolean
}

export function refreshSession(refreshToken: string) {
  return authRequest<AuthResponse>('/auth/refresh', { refreshToken })
}

export function revokeSession(refreshToken: string) {
  return authRequest<{ success: true }>('/auth/logout', { refreshToken })
}

export async function authRequest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new Error(errorMessage(payload) ?? `Yêu cầu thất bại (${response.status})`)
  }
  return response.json() as Promise<T>
}

function errorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return null
  const message = payload.message
  return Array.isArray(message) ? message.join('\n') : typeof message === 'string' ? message : null
}
