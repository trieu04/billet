/* oxlint-disable react/only-export-components */
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authRequest, type AuthResponse, type User } from './api'

const TOKEN_KEY = 'billet.access-token'
const USER_KEY = 'billet.user'

type SessionValue = {
  token: string | null
  user: User | null
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
  const value = useMemo<SessionValue>(
    () => ({
      token,
      user,
      authenticate(response) {
        if (response.requiresMfa) throw new Error('Tài khoản yêu cầu xác thực hai bước.')
        localStorage.setItem(TOKEN_KEY, response.accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(response.user))
        setToken(response.accessToken)
        setUser(response.user)
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      },
    }),
    [token, user],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function RequireSession({ children }: PropsWithChildren) {
  const { token } = useWebSession()
  const location = useLocation()
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
