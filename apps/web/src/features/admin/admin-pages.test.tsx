import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/routes'
import { WebSessionProvider } from '@/features/auth/session'
import type { Catalog, Inference, Summary } from './types'

const SUMMARY: Summary = {
  from: '2026-10-27T00:00:00.000Z',
  to: '2026-11-03T00:00:00.000Z',
  timezone: 'UTC',
  total: 4,
  byStatus: [
    { key: 'succeeded', count: 3 },
    { key: 'unavailable', count: 1 },
  ],
  byReason: [{ key: 'timeout', count: 1 }],
  byImageType: [{ key: 'receipt', count: 3 }],
  providerCalls: 4,
  latencyP50Ms: 900,
  latencyP95Ms: 2000,
  usage: { inputTokens: 1200, outputTokens: 80, costMicroUsd: 1500 },
  daily: [
    {
      day: '2026-11-02',
      total: 4,
      succeeded: 3,
      unavailable: 1,
      disabled: 0,
      costMicroUsd: 1500,
    },
  ],
  byProvider: [],
  fieldOutcomes: [{ field: 'categoryId', outcome: 'accepted', count: 2 }],
}

const CATALOG: Catalog = {
  imageTypes: [
    { key: 'receipt', label: 'Hóa đơn', description: null, status: 'enabled', version: 3 },
    { key: 'other', label: 'Khác', description: null, status: 'enabled', version: 1 },
  ],
  defaultRules: [],
  categories: [],
  thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
  decisionImage: {
    maxEdgePx: 1024,
    quality: 0.6,
    retryQuality: 0.45,
    targetBytes: 150_000,
    maxBytes: 400_000,
  },
}

const INFERENCE: Inference = {
  id: '7',
  userId: '42',
  createdAt: '2026-11-02T00:00:00.000Z',
  provider: 'fake',
  model: 'fake',
  status: 'succeeded',
  reason: null,
  latencyMs: 10,
  providerCalled: true,
  imageType: null,
  category: null,
  personalChoice: null,
}

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown }

function respondWith(handler: Handler) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const { status, body } = handler(url, init)
      return new Response(JSON.stringify(body), { status })
    }),
  )
  return calls
}

function renderAt(path: string) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <WebSessionProvider>
          <AppRoutes />
        </WebSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function signIn() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  localStorage.setItem('billet.access-token', `h.${payload}.s`)
}

describe('admin pages', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows no access and requests nothing else for a non-admin', async () => {
    signIn()
    const calls = respondWith(() => ({ status: 403, body: {} }))
    renderAt('/admin/recognition')

    expect(await screen.findByRole('heading', { name: 'Không có quyền' })).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toMatch(/\/api\/v1\/admin\/me$/)
  })

  it('sends a signed-out visitor to the login page', async () => {
    const calls = respondWith(() => ({ status: 401, body: {} }))
    renderAt('/admin/recognition')

    await waitFor(() => expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument())
    expect(calls.some((call) => call.url.includes('/admin/'))).toBe(false)
  })

  it('renders the overview with its figures and all tabs', async () => {
    signIn()
    respondWith((url) =>
      url.endsWith('/admin/me')
        ? { status: 200, body: { isAdmin: true } }
        : { status: 200, body: SUMMARY },
    )
    renderAt('/admin')

    expect(await screen.findByText('2026-11-02')).toBeInTheDocument()
    expect(screen.getByText('Tổng inference').nextSibling).toHaveTextContent('4')
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Quá thời gian chờ' })).toBeInTheDocument()
    for (const tab of ['Tổng quan', 'Nhật ký', 'Catalog', 'Playground'])
      expect(screen.getByRole('link', { name: tab })).toBeInTheDocument()
  })

  it('loads a linked expense photo only when asked and hides it again', async () => {
    signIn()
    // jsdom's FileReader rejects the Blob made by the runtime's fetch Response.
    vi.stubGlobal(
      'FileReader',
      class {
        result = 'data:image/jpeg;base64,AA=='
        onload: (() => void) | null = null
        readAsDataURL() {
          this.onload?.()
        }
      },
    )
    const photoPath = '/recognition/inferences/7/linked-expenses/0/photo'
    const calls = respondWith((url) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (url.endsWith('/recognition/inferences/7'))
        return {
          status: 200,
          body: {
            ...INFERENCE,
            usage: null,
            imageBytes: 1,
            choiceSetVersion: 'v',
            linkedExpenses: [
              { hasPhoto: true, fields: [] },
              { hasPhoto: false, fields: [] },
            ],
          },
        }
      if (url.endsWith(photoPath)) return { status: 200, body: {} }
      return { status: 200, body: { data: [INFERENCE], nextCursor: null, hasMore: false } }
    })
    renderAt('/admin/recognition/logs')

    fireEvent.click(await screen.findByRole('button', { name: 'Chi tiết inference 7' }))
    const show = await screen.findByRole('button', { name: 'Xem ảnh khoản chi liên kết 1' })
    expect(screen.getByText('Khoản chi này không có ảnh.')).toBeInTheDocument()
    expect(calls.some((call) => call.url.endsWith(photoPath))).toBe(false)

    fireEvent.click(show)
    const image = await screen.findByRole('img', { name: 'Ảnh đã lưu của khoản chi liên kết 1' })
    expect(image.getAttribute('src')).toMatch(/^data:/)
    const photoCall = calls.find((call) => call.url.endsWith(photoPath))
    expect(new Headers(photoCall?.init?.headers).get('Authorization')).toMatch(/^Bearer /)

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn ảnh khoản chi liên kết 1' }))
    await waitFor(() => expect(screen.queryByRole('img', { name: /Ảnh đã lưu/ })).toBeNull())
  })

  it('shows the choice set sent to the provider and its output with labels, not ids', async () => {
    signIn()
    respondWith((url) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (url.endsWith('/recognition/inferences/7'))
        return {
          status: 200,
          body: {
            ...INFERENCE,
            usage: { inputTokens: 120, outputTokens: 12, costMicroUsd: 250 },
            imageBytes: 1,
            choiceSetVersion: 'v',
            linkedExpenses: [],
            input: {
              locale: 'vi-VN',
              imageTypes: [
                { ref: 't1', label: 'Hóa đơn', description: 'Phiếu in nhiệt', selected: false },
                { ref: 't2', label: 'Vé gửi xe', selected: true },
              ],
              categories: [{ ref: 'c1', label: 'Di chuyển', selected: true }],
              personal: [],
            },
            output: {
              imageType: { ref: 't2', label: 'Vé gửi xe', confidence: 0.9 },
              category: { ref: 'c1', label: 'Di chuyển', confidence: 0.7 },
              personal: null,
            },
          },
        }
      return { status: 200, body: { data: [INFERENCE], nextCursor: null, hasMore: false } }
    })
    renderAt('/admin/recognition/logs')

    fireEvent.click(await screen.findByRole('button', { name: 'Chi tiết inference 7' }))

    expect(await screen.findByText('Đã chọn: Vé gửi xe')).toBeInTheDocument()
    const imageTypes = screen.getByRole('list', { name: 'Loại ảnh được đưa ra', hidden: true })
    expect(within(imageTypes).getByText('Hóa đơn')).toBeInTheDocument()
    expect(within(imageTypes).getByText('Phiếu in nhiệt')).toBeInTheDocument()
    expect(within(imageTypes).getAllByText(/Được chọn/)).toHaveLength(1)

    const output = screen.getByRole('table', { name: 'Output của provider' })
    expect(within(output).getByText('Di chuyển')).toBeInTheDocument()
    expect(within(output).getByRole('meter', { name: 'Độ tin cậy Danh mục' })).toHaveAttribute(
      'aria-valuenow',
      '70',
    )
    expect(within(output).getByText('Không chọn')).toBeInTheDocument()
  })

  it('explains when an inference has no recorded input or output', async () => {
    signIn()
    respondWith((url) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (url.endsWith('/recognition/inferences/7'))
        return {
          status: 200,
          body: {
            ...INFERENCE,
            usage: null,
            imageBytes: 1,
            choiceSetVersion: '',
            linkedExpenses: [],
            input: null,
            output: null,
          },
        }
      return { status: 200, body: { data: [INFERENCE], nextCursor: null, hasMore: false } }
    })
    renderAt('/admin/recognition/logs')

    fireEvent.click(await screen.findByRole('button', { name: 'Chi tiết inference 7' }))

    expect(await screen.findByText('Không có dữ liệu input cho inference này.')).toBeInTheDocument()
    expect(screen.getByText('Không có dữ liệu output cho inference này.')).toBeInTheDocument()
  })

  it('asks before disabling an image type and never offers it for the fallback', async () => {
    signIn()
    const calls = respondWith((url, init) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (init?.method === 'PATCH') return { status: 200, body: {} }
      return { status: 200, body: CATALOG }
    })
    renderAt('/admin/recognition/catalog')

    fireEvent.click(await screen.findByRole('button', { name: 'Tắt receipt' }))
    expect(calls.some((call) => call.init?.method === 'PATCH')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Tắt other' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tắt receipt' }))
    await waitFor(() => {
      const patch = calls.find((call) => call.init?.method === 'PATCH')
      expect(patch?.url).toMatch(/\/api\/v1\/admin\/recognition\/image-types\/receipt$/)
      expect(JSON.parse(String(patch?.init?.body))).toEqual({ status: 'disabled', version: 3 })
    })
  })

  it('reports a version conflict and reloads the catalog', async () => {
    signIn()
    let reads = 0
    respondWith((url, init) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (init?.method === 'PATCH') return { status: 409, body: {} }
      reads += 1
      return { status: 200, body: CATALOG }
    })
    renderAt('/admin/recognition/catalog')

    fireEvent.click(await screen.findByRole('button', { name: 'Sửa receipt' }))
    fireEvent.change(await screen.findByLabelText('Nhãn'), { target: { value: 'Hóa đơn mới' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('vừa được người khác thay đổi')
    await waitFor(() => expect(reads).toBe(2))
  })

  it('filters the catalog table by search text and status', async () => {
    signIn()
    respondWith((url) =>
      url.endsWith('/admin/me')
        ? { status: 200, body: { isAdmin: true } }
        : {
            status: 200,
            body: {
              ...CATALOG,
              imageTypes: [
                ...CATALOG.imageTypes,
                { key: 'food', label: 'Món ăn', description: null, status: 'disabled', version: 1 },
              ],
            },
          },
    )
    renderAt('/admin/recognition/catalog')

    expect(await screen.findByRole('cell', { name: 'food' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tìm kiếm'), { target: { value: 'hóa' } })
    expect(screen.queryByRole('cell', { name: 'food' })).not.toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'receipt' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tìm kiếm'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'disabled' } })
    expect(screen.getByRole('cell', { name: 'food' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'receipt' })).not.toBeInTheDocument()
  })

  it('previews an imported file and applies only the differences', async () => {
    signIn()
    const calls = respondWith((url, init) => {
      if (url.endsWith('/admin/me')) return { status: 200, body: { isAdmin: true } }
      if (init?.method === 'PATCH') return { status: 200, body: {} }
      return { status: 200, body: CATALOG }
    })
    renderAt('/admin/recognition/catalog')

    const file = new File(
      [
        JSON.stringify({
          format: 'billet.recognition-catalog',
          version: 1,
          exportedAt: '2026-11-03T00:00:00.000Z',
          imageTypes: [
            { key: 'receipt', label: 'Biên lai', description: null, status: 'enabled' },
            { key: 'other', label: 'Khác', description: null, status: 'enabled' },
          ],
          defaultRules: [],
        }),
      ],
      'catalog.json',
      { type: 'application/json' },
    )
    fireEvent.change(await screen.findByLabelText('Nhập catalog từ tệp JSON'), {
      target: { files: [file] },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Áp dụng 1 thay đổi' }))
    await waitFor(() => {
      const patch = calls.find((call) => call.init?.method === 'PATCH')
      expect(patch?.url).toMatch(/\/api\/v1\/admin\/recognition\/image-types\/receipt$/)
      expect(JSON.parse(String(patch?.init?.body))).toEqual({ label: 'Biên lai', version: 3 })
    })
    expect(await screen.findByText('Đã áp dụng 1/1 thay đổi.')).toBeInTheDocument()
  })
})
