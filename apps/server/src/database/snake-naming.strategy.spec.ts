import { snakeNamingStrategy } from './snake-naming.strategy'

describe('snakeNamingStrategy', () => {
  it('maps entity properties and relation columns to snake_case', () => {
    expect(snakeNamingStrategy.columnName('mfaMethods', undefined, [])).toBe('mfa_methods')
    expect(snakeNamingStrategy.columnName('createdAt', undefined, [])).toBe('created_at')
    expect(snakeNamingStrategy.joinColumnName('userProfile', 'id')).toBe('user_profile_id')
  })

  it('preserves explicit names while normalizing embedded prefixes', () => {
    expect(snakeNamingStrategy.columnName('city', 'city_name', ['billingAddress'])).toBe(
      'billing_address_city_name',
    )
  })
})
