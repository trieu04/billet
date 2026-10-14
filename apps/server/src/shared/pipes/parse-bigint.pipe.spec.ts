import { BadRequestException } from '@nestjs/common'
import { ParseBigIntPipe } from './parse-bigint.pipe'

describe('ParseBigIntPipe', () => {
  const pipe = new ParseBigIntPipe()

  it('keeps valid bigint identifiers as strings', () => {
    expect(pipe.transform('9223372036854775807')).toBe('9223372036854775807')
  })

  it.each(['0', '-1', '1.5', 'abc', '', 1])('rejects invalid identifier %p', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException)
  })
})
