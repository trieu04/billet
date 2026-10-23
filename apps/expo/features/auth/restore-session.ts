import { ApiError, apiRequest } from '../api/client'
import type { User } from '../api/types'

type TokenStorage = {
  loadToken(): Promise<string | null>
  saveToken(token: string | null): Promise<void>
}

type RestoredSession = {
  token: string | null
  user: User | null
}

export async function restoreSession(storage: TokenStorage): Promise<RestoredSession> {
  const token = await storage.loadToken()
  if (!token) return { token: null, user: null }

  try {
    const user = await apiRequest<User>('/auth/me', { token })
    return { token, user }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await storage.saveToken(null)
      return { token: null, user: null }
    }

    // An unavailable server cannot determine whether the stored session is invalid.
    return { token, user: null }
  }
}
