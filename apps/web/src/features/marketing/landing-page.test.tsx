import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WebSessionProvider } from '@/features/auth/session'
import { LandingPage } from './landing-page'

function renderLanding() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WebSessionProvider>
          <LandingPage />
        </WebSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LandingPage', () => {
  it('introduces Billet and links to account creation', () => {
    renderLanding()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tiền của bạn cũng có một câu chuyện.',
    )
    expect(screen.getAllByRole('link', { name: /Bắt đầu miễn phí/i })[0]).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.getByRole('link', { name: 'Chính sách quyền riêng tư' })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })

  it('exposes mobile navigation from the menu control', () => {
    renderLanding()

    const menu = screen.getByRole('button', { name: 'Mở menu' })
    fireEvent.click(menu)
    expect(screen.getByRole('navigation', { name: 'Di động' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
