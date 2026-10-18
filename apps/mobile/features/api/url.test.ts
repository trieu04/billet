import { describe, expect, it } from 'vitest'

import { resolveApiBaseUrl, resolveApiUrl } from './url'

describe('resolveApiBaseUrl', () => {
  it('uses the Expo development host for a native app configured with localhost', () => {
    expect(resolveApiBaseUrl('http://localhost:6701/api/v1', '192.168.1.10:6703')).toBe(
      'http://192.168.1.10:6701/api/v1',
    )
  })

  it('supports Expo host URIs that include a protocol', () => {
    expect(resolveApiBaseUrl('http://127.0.0.1:6701/api/v1/', 'exp://192.168.1.20:6703')).toBe(
      'http://192.168.1.20:6701/api/v1',
    )
  })

  it('keeps localhost when Expo does not provide a development host', () => {
    expect(resolveApiBaseUrl('http://localhost:6701/api/v1', undefined)).toBe(
      'http://localhost:6701/api/v1',
    )
  })

  it('preserves an explicitly configured remote API host', () => {
    expect(resolveApiBaseUrl('https://api.billet.example/api/v1', '192.168.1.10:6703')).toBe(
      'https://api.billet.example/api/v1',
    )
  })
})

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
