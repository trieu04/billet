import { ValidateBy } from 'class-validator'

const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n

/** Canonical positive decimal that fits PostgreSQL `bigint`, the type of entity ids. */
export function isPositiveBigint(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[1-9]\d{0,18}$/.test(value) &&
    BigInt(value) <= POSTGRES_BIGINT_MAX
  )
}

export function IsPositiveBigint(): PropertyDecorator {
  return ValidateBy({
    name: 'isPositiveBigint',
    validator: {
      validate: isPositiveBigint,
      defaultMessage: () => '$property must be a positive bigint string',
    },
  })
}
