import { csvCell } from './service'
describe('csvCell', () => {
  it('quotes commas and quotes', () => expect(csvCell('shop, "one"')).toBe('"shop, ""one"""'))
  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A:A)', '\tformula'])(
    'neutralizes spreadsheet formula text %s',
    (value) => expect(csvCell(value)).toBe(`"'${value}"`),
  )
})
