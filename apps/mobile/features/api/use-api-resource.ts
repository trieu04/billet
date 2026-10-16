/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'

import { ApiError } from './client'
import { useSession } from '../auth/session'

export function useApiResource<T>(load: (token: string) => Promise<T>) {
  const { token, logout } = useSession()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!token) return
    await Promise.resolve()
    setLoading(true)
    setError(null)
    try {
      setData(await load(token))
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) await logout()
      else setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [load, logout, token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, error, loading, refresh, setData }
}
