import { describe, expect, it } from 'vitest'

import { isDeleteConfirmed } from './delete-confirmation'

describe('isDeleteConfirmed', () => {
  it.each([
    ['Delete', true],
    ['  Delete ', true],
    ['delete', false],
    ['DELETE', false],
    ['Delet', false],
    ['', false],
  ])('%j -> %s', (input, expected) => {
    expect(isDeleteConfirmed(input)).toBe(expected)
  })
})
