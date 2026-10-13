import { describe, expect, it } from 'vitest'
import { healthStatus } from './health-status'

describe('healthStatus', () => {
  it('reports a healthy mobile application', () => {
    expect(healthStatus.healthy).toBe(true)
  })
})
