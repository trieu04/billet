/* oxlint-disable react/only-export-components */
import * as SecureStore from 'expo-secure-store'
import { type Href, router, useSegments } from 'expo-router'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Platform } from 'react-native'

import { apiRequest } from '@/features/api/client'
import type { AuthResponse, User } from '@/features/api/types'

import { restoreSession } from './restore-session'

const TOKEN_KEY = 'billet.access-token'

type SessionContextValue = {
  token: string | null
  user: User | null
  ready: boolean
  login(identifier: string, password: string): Promise<void>
  register(input: { email: string; password: string; verificationToken: string }): Promise<void>
  socialLogin(
    provider: 'google' | 'apple',
    identityToken: string,
    displayName?: string,
  ): Promise<void>
  logout(): Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

async function loadToken() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null
  return SecureStore.getItemAsync(TOKEN_KEY)
}

async function saveToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token)
    else globalThis.localStorage?.removeItem(TOKEN_KEY)
    return
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token)
  else await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const logout = useCallback(async () => {
    await saveToken(null)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    void (async () => {
      const session = await restoreSession({ loadToken, saveToken })
      setToken(session.token)
      setUser(session.user)
      setReady(true)
    })()
  }, [])

  const acceptAuth = useCallback(async (response: AuthResponse) => {
    if (response.requiresMfa) throw new Error('Tài khoản cần xác thực hai bước, chưa được hỗ trợ.')
    await saveToken(response.accessToken)
    setToken(response.accessToken)
    setUser(response.user)
  }, [])

  const login = useCallback(
    async (identifier: string, password: string) => {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { identifier, password },
      })
      await acceptAuth(response)
    },
    [acceptAuth],
  )

  const register = useCallback(
    async (input: { email: string; password: string; verificationToken: string }) => {
      await acceptAuth(
        await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: {
            ...input,
            verificationToken: undefined,
            verificationTokens: [input.verificationToken],
          },
        }),
      )
    },
    [acceptAuth],
  )

  const socialLogin = useCallback(
    async (provider: 'google' | 'apple', identityToken: string, displayName?: string) => {
      await acceptAuth(
        await apiRequest<AuthResponse>('/auth/social', {
          method: 'POST',
          body: { provider, identityToken, displayName },
        }),
      )
    },
    [acceptAuth],
  )

  const value = useMemo(
    () => ({ token, user, ready, login, register, socialLogin, logout }),
    [login, logout, ready, register, socialLogin, token, user],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function SessionGuard({ children }: PropsWithChildren) {
  const { ready, token } = useSession()
  const segments = useSegments()
  const isAuthRoute = ['login', 'register', 'forgot-password'].includes(
    (segments[0] as string | undefined) ?? '',
  )

  useEffect(() => {
    if (!ready) return
    if (!token && !isAuthRoute) router.replace('/login' as Href)
    if (token && isAuthRoute) router.replace('/')
  }, [isAuthRoute, ready, token])

  if (!ready || (!token && !isAuthRoute) || (token && isAuthRoute)) return null
  return children
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
