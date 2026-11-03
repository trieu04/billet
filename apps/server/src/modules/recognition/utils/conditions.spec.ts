import { createHash } from 'node:crypto'
import { canonicalConditions, conditionsHash } from './conditions'

describe('conditionsHash', () => {
  it('ignores key order and absent values', () => {
    expect(conditionsHash({ placeKey: 'w3gvk1c', imageType: 'parking_ticket' })).toBe(
      conditionsHash({ imageType: 'parking_ticket', placeKey: 'w3gvk1c', merchantKey: undefined }),
    )
    expect(canonicalConditions({ merchantKey: 'a', choiceId: '1' })).toEqual({
      choiceId: '1',
      merchantKey: 'a',
    })
  })

  it('matches the hash the seed migration writes for default rules', () => {
    expect(conditionsHash({ imageType: 'food' })).toBe(
      createHash('sha256').update('{"imageType":"food"}').digest('hex'),
    )
  })
})
