import { describe, expect, it } from 'vitest'

import { resolveApiUrl } from './url'

describe('resolveApiUrl', () => {
  const baseUrl = 'http://192.168.1.10:6700/api/v1'

  it('appends regular API paths to the configured base URL', () => {
    expect(resolveApiUrl(baseUrl, '/expenses')).toBe('http://192.168.1.10:6700/api/v1/expenses')
  })

  it('does not duplicate the base path in an origin-relative upload URL', () => {
    expect(resolveApiUrl(baseUrl, '/api/v1/media/42/content')).toBe(
      'http://192.168.1.10:6700/api/v1/media/42/content',
    )
  })
})
