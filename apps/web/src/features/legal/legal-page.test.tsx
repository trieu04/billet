import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WebSessionProvider } from '@/features/auth/session'
import { PrivacyPage, TermsPage } from './legal-page'

function renderPage(page: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WebSessionProvider>{page}</WebSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('legal pages', () => {
  it('shows the terms and their effective date', () => {
    renderPage(<TermsPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Điều khoản sử dụng')
    expect(screen.getByText('Có hiệu lực từ ngày 30 tháng 10 năm 2026')).toBeInTheDocument()
    expect(screen.getByText('Đơn vị vận hành: Trương Quốc Triệu')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '12. Luật áp dụng và giải quyết tranh chấp' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'trieu.tq@fayedark.com' })[0]).toHaveAttribute(
      'href',
      'mailto:trieu.tq@fayedark.com',
    )
  })

  it('explains data processing without claiming that data is sold', () => {
    renderPage(<PrivacyPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chính sách quyền riêng tư')
    expect(screen.getByText(/Billet không bán dữ liệu cá nhân/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '5. Phân tích, cải thiện sản phẩm và mô hình AI' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/không dùng ảnh, chú thích hoặc dữ liệu tài chính/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '10. Quyền của bạn' })).toBeInTheDocument()
  })
})
