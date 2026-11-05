import { describe, expect, it } from 'vitest'
import { postLoginPath } from './return-path'

describe('postLoginPath', () => {
  it('returns to the admin area', () => {
    expect(postLoginPath({ from: '/admin' })).toBe('/admin')
    expect(postLoginPath({ from: '/admin/recognition/logs' })).toBe('/admin/recognition/logs')
  })

  it('returns to the signed-in app pages', () => {
    expect(postLoginPath({ from: '/stats' })).toBe('/stats')
    expect(postLoginPath({ from: '/journal/42' })).toBe('/journal/42')
    expect(postLoginPath({ from: '/settings' })).toBe('/settings')
  })

  it('goes to the journal otherwise', () => {
    expect(postLoginPath(null)).toBe('/journal')
    expect(postLoginPath({ from: '/journal' })).toBe('/journal')
    expect(postLoginPath({ from: '/administrator' })).toBe('/journal')
    expect(postLoginPath({ from: '/statsx' })).toBe('/journal')
    expect(postLoginPath({ from: '/' })).toBe('/journal')
    expect(postLoginPath({ from: 'https://evil.example/admin' })).toBe('/journal')
  })
})
