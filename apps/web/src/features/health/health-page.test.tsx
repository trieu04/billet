import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HealthPage } from './health-page'

describe('HealthPage', () => {
  it('shows the application health state', () => {
    render(<HealthPage />)
    expect(screen.getByRole('heading')).toHaveTextContent('Billet web is healthy')
  })
})
