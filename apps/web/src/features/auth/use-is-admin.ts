import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api-client'
import { useWebSession } from './session'

/**
 * Whether the signed-in account may use the admin area. The server is the only authority
 * (admin rights are not part of the token), so this asks it; any non-admin answer is `false`.
 */
export function useIsAdmin(): boolean {
  const { token } = useWebSession()
  const access = useQuery({
    queryKey: ['access', 'admin', token],
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        await apiFetch<{ isAdmin: true }>(token, '/admin/me')
        return true
      } catch (error) {
        if (error instanceof ApiError && (error.status === 403 || error.status === 401))
          return false
        throw error
      }
    },
  })
  return access.data === true
}
