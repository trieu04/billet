import { nextOccurrence } from './service'
describe('nextOccurrence', () => {
  it('uses the account timezone instead of adding 24 hours', () => {
    const next = nextOccurrence('Asia/Ho_Chi_Minh', '20:00', new Date('2026-10-15T12:59:30Z'))
    expect(next.toISOString()).toBe('2026-10-15T13:00:30.000Z')
  })
  it('moves to the following local day after the selected minute', () => {
    const next = nextOccurrence('Asia/Ho_Chi_Minh', '20:00', new Date('2026-10-15T13:00:30Z'))
    expect(next.toISOString()).toBe('2026-10-16T13:00:30.000Z')
  })
})
