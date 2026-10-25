import { apiRequest } from '@/features/api/client'
import type { Settings } from '@/features/api/types'

export type SettingsPatch = Partial<
  Pick<
    Settings,
    'appearance' | 'defaultCurrency' | 'locale' | 'reminderEnabled' | 'reminderTime' | 'timezone'
  >
>

export async function updateSettings(token: string, patch: SettingsPatch) {
  const settings = await apiRequest<Settings>('/profile/settings', {
    body: patch,
    method: 'PATCH',
    token,
  })
  if ('reminderEnabled' in patch || 'reminderTime' in patch || 'timezone' in patch) {
    await apiRequest('/reminders/sync', { method: 'POST', token })
  }
  return settings
}

export function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
}
