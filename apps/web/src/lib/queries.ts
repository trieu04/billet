import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Category } from '@/components/category'
import { useWebSession } from '@/features/auth/session'
import { queryString, useApi, useBlobFetcher } from './api-client'

export type Settings = {
  id: string
  defaultCurrency: string
  timezone: string
  locale: string
  appearance: 'system' | 'light' | 'dark'
  reminderEnabled: boolean
  reminderTime: string | null
  suggestionsEnabled: boolean
  ruleLearningEnabled: boolean
  suggestionLocationEnabled: boolean
}

export type Profile = {
  id: string
  username: string
  email: string
  displayName: string
  createdAt: string
  settings: Settings
  expenseCount: number
}

/** Keys are scoped by user so one account never sees another's cached data. */
export function useScopedKey() {
  const { user } = useWebSession()
  return (...parts: unknown[]) => ['u', user?.id ?? 'anonymous', ...parts]
}

export function useProfile() {
  const api = useApi()
  const key = useScopedKey()
  return useQuery({
    queryKey: key('profile'),
    queryFn: () => api<Profile>('/profile'),
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const api = useApi()
  const client = useQueryClient()
  const key = useScopedKey()
  return useMutation({
    mutationFn: async (input: { displayName?: string; settings?: Partial<Settings> }) => {
      if (input.settings) await api('/profile/settings', { method: 'PATCH', json: input.settings })
      if (input.displayName !== undefined)
        await api('/profile', { method: 'PATCH', json: { displayName: input.displayName } })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key('profile') }),
  })
}

export function useCategories() {
  const api = useApi()
  const key = useScopedKey()
  return useQuery({
    queryKey: key('categories'),
    queryFn: () => api<Category[]>('/categories'),
    staleTime: 60_000,
  })
}

/** Looks up categories by id for rendering lists. */
export function useCategoryIndex() {
  const categories = useCategories()
  const index = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category])),
    [categories.data],
  )
  return { ...categories, index }
}

/** Object URL for a private media asset, fetched with the session token and cached. */
export function useMediaUrl(mediaId: string | null | undefined): string | null {
  const fetchBlob = useBlobFetcher()
  const key = useScopedKey()
  const blob = useQuery({
    queryKey: key('media', mediaId),
    enabled: Boolean(mediaId),
    queryFn: () => fetchBlob(`/media/${mediaId}/content`),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  })
  const url = useMemo(() => (blob.data ? URL.createObjectURL(blob.data) : null), [blob.data])
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )
  return url
}

export type Budget = {
  month: string
  currency: string
  isSet: boolean
  limitMinor: string | null
  spentMinor: string
  remainingMinor: string | null
}

export function useBudget(month: string, currency: string | undefined) {
  const api = useApi()
  const key = useScopedKey()
  return useQuery({
    queryKey: key('budget', month, currency),
    enabled: Boolean(currency),
    queryFn: () => api<Budget>(`/budgets${queryString({ month, currency })}`),
  })
}

/** Refreshes everything derived from expenses after one is created, edited, or removed. */
export function useInvalidateExpenseData() {
  const client = useQueryClient()
  const key = useScopedKey()
  return () =>
    Promise.all(
      ['expenses', 'calendar', 'budget', 'report', 'profile', 'categories'].map((name) =>
        client.invalidateQueries({ queryKey: key(name) }),
      ),
    )
}
