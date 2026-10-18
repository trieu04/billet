import { isValidStorageKey } from './local.service'

describe('isValidStorageKey', () => {
  it.each(['fixture.jpg', 'fixture.jpeg', 'fixture.png', 'fixture.webp'])(
    'accepts the supported image extension in %s',
    (filename) => {
      expect(isValidStorageKey(`media/sample/${filename}`)).toBe(true)
    },
  )

  it('rejects path traversal', () => {
    expect(isValidStorageKey('../fixture.jpg')).toBe(false)
  })
})
