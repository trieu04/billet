import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PrivacyPage, TermsPage } from './legal-page'

describe('legal pages', () => {
  it('shows the terms and their effective date', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chính sách quyền riêng tư')
    expect(screen.getByText(/Billet không bán dữ liệu cá nhân/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '5. Phân tích, cải thiện sản phẩm và mô hình AI' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/không dùng ảnh, chú thích hoặc dữ liệu tài chính/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '10. Quyền của bạn' })).toBeInTheDocument()
  })
})
