/* oxlint-disable react/only-export-components */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authRequest, refreshSession, revokeSession, type AuthResponse, type User } from './api'

const TOKEN_KEY = 'billet.access-token'
const USER_KEY = 'billet.user'
const REFRESH_TOKEN_KEY = 'billet.refresh-token'

type SessionValue = {
  token: string | null
  user: User | null
  ready: boolean
  authenticate(response: AuthResponse): void
  logout(): void
}

const SessionContext = createContext<SessionValue | null>(null)

export function WebSessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(false)

  const acceptAuth = useCallback((response: AuthResponse) => {
    if (response.requiresMfa) throw new Error('Tài khoản yêu cầu xác thực hai bước.')
    if (!response.refreshToken) throw new Error('Máy chủ không trả về refresh token.')
    localStorage.setItem(TOKEN_KEY, response.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    setToken(response.accessToken)
    setUser(response.user)
    return response.expiresIn
  }, [])

  useEffect(() => {
    let active = true
    let refreshing = false
    const rotate = async () => {
      if (refreshing) return
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        if (active) setReady(true)
        return
      }
      refreshing = true
      try {
        acceptAuth(await refreshSession(refreshToken))
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        if (active) {
          setToken(null)
          setUser(null)
        }
      } finally {
        refreshing = false
        if (active) setReady(true)
      }
    }
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken || tokenExpiresSoon(storedToken)) void rotate()
    else queueMicrotask(() => active && setReady(true))
    const interval = window.setInterval(() => {
      const accessToken = localStorage.getItem(TOKEN_KEY)
      if (accessToken && tokenExpiresSoon(accessToken)) void rotate()
    }, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [acceptAuth])
  const value = useMemo<SessionValue>(
    () => ({
      token,
      user,
      ready,
      authenticate(response) {
        acceptAuth(response)
      },
      logout() {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        if (refreshToken) void revokeSession(refreshToken).catch(() => undefined)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      },
    }),
    [acceptAuth, ready, token, user],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

function tokenExpiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: unknown
    }
    return typeof payload.exp !== 'number' || payload.exp * 1_000 <= Date.now() + 90_000
  } catch {
    return true
  }
}

export function RequireSession({ children }: PropsWithChildren) {
  const { ready, token } = useWebSession()
  const location = useLocation()
  if (!ready) return null
  return token ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function useWebSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useWebSession must be used inside WebSessionProvider')
  return value
}

export async function passwordLogin(identifier: string, password: string) {
  return authRequest<AuthResponse>('/auth/login', { identifier, password })
}
