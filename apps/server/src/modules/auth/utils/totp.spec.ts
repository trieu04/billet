import { createTotpUri, generateTotpSecret, verifyTotp } from './totp'

describe('TOTP', () => {
  it('generates an authenticator-compatible secret and URI', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    expect(createTotpUri(secret, 'trieu@example.com')).toContain(`secret=${secret}`)
  })

  it('rejects malformed codes', () => {
    expect(verifyTotp(generateTotpSecret(), '1234')).toBe(false)
  })
})
