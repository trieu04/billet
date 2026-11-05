import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/routes'
import { ToastProvider } from '@/components/toast'
import { WebSessionProvider } from '@/features/auth/session'

const SETTINGS = {
  id: '1',
  defaultCurrency: 'VND',
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  appearance: 'system',
  reminderEnabled: false,
  reminderTime: null,
  suggestionsEnabled: true,
  ruleLearningEnabled: true,
  suggestionLocationEnabled: false,
}
const PROFILE = {
  id: '1',
  username: 'devt',
  email: 'devt@example.com',
  displayName: 'Dev T',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: SETTINGS,
  expenseCount: 0,
}
const CATEGORIES = [
  {
    id: '5',
    code: 'food',
    name: 'Ăn uống',
    color: '#F4B89C',
    icon: 'coffee',
    sortOrder: 1,
    usageCount: 0,
    isCustom: false,
  },
]

type Call = { url: string; init?: RequestInit }

function stubApi(admin: boolean) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
      if (url.endsWith('/admin/me')) return json(admin ? 200 : 403, { isAdmin: true })
      if (url.endsWith('/profile')) return json(200, PROFILE)
      if (url.endsWith('/categories')) return json(200, CATEGORIES)
      if (url.includes('/expenses/calendar'))
        return json(200, { month: '2026-11', currency: 'VND', totalMinor: '0', count: 0, days: [] })
      if (url.includes('/budgets'))
        return json(200, {
          month: '2026-11',
          currency: 'VND',
          isSet: false,
          limitMinor: null,
          spentMinor: '0',
          remainingMinor: null,
        })
      if (url.includes('/expenses') && init?.method === 'POST')
        return json(201, {
          id: '9',
          amountMinor: '55000',
          currency: 'VND',
          occurredAt: new Date().toISOString(),
        })
      if (url.includes('/expenses')) return json(200, { data: [], nextCursor: null, totals: [] })
      return json(404, {})
    }),
  )
  return calls
}

function renderAt(path: string) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  localStorage.setItem('billet.access-token', `h.${payload}.s`)
  localStorage.setItem(
    'billet.user',
    JSON.stringify({ id: '1', username: 'devt', email: 'devt@example.com', displayName: 'Dev T' }),
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <WebSessionProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </WebSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('signed-in app', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('invites a new user to record their first expense', async () => {
    stubApi(false)
    renderAt('/journal')
    expect(await screen.findByText('Cuốn nhật ký của bạn còn trống')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ghi khoản chi đầu tiên/ })).toHaveAttribute(
      'href',
      '/journal/new',
    )
  })

  it('shows the admin link only to admins', async () => {
    stubApi(true)
    renderAt('/journal')
    expect(await screen.findByRole('link', { name: 'Quản trị' })).toHaveAttribute('href', '/admin')
  })

  it('hides the admin link from other users', async () => {
    const calls = stubApi(false)
    renderAt('/journal')
    await screen.findByText('Cuốn nhật ký của bạn còn trống')
    await waitFor(() => expect(calls.some((call) => call.url.endsWith('/admin/me'))).toBe(true))
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument()
  })

  it('validates the amount, then saves the expense with an idempotency key', async () => {
    const calls = stubApi(false)
    renderAt('/journal/new')
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu vào nhật ký' }))
    expect(await screen.findByText(/Nhập số tiền lớn hơn 0/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Số tiền'), { target: { value: '55.000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu vào nhật ký' }))
    await waitFor(() => {
      const post = calls.find((call) => call.init?.method === 'POST')
      const body = JSON.parse(String(post?.init?.body))
      expect(body).toMatchObject({ amountMinor: '55000', currency: 'VND' })
      expect(body.idempotencyKey).toMatch(/^[A-Za-z0-9._:-]{8,100}$/)
    })
  })
})
