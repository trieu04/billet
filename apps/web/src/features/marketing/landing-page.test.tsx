import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './landing-page'

describe('LandingPage', () => {
  it('introduces Billet and links to account creation', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    const menu = screen.getByRole('button', { name: 'Mở menu' })
    fireEvent.click(menu)
    expect(screen.getByRole('navigation', { name: 'Di động' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
