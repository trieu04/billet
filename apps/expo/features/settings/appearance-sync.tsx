import { useEffect } from 'react'
import { Appearance } from 'react-native'

import { apiRequest } from '@/features/api/client'
import type { Settings } from '@/features/api/types'
import { useSession } from '@/features/auth/session'

export function AppearanceSync() {
  const { token } = useSession()

  useEffect(() => {
    if (!token) return
    void apiRequest<Settings>('/profile/settings', { token })
      .then((settings) => {
        Appearance.setColorScheme(
          settings.appearance === 'system' ? 'unspecified' : settings.appearance,
        )
      })
      .catch(() => undefined)
  }, [token])

  return null
}
