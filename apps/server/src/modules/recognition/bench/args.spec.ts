import { parseBenchArgs } from './args'

describe('parseBenchArgs', () => {
  it('parses the required options with defaults', () => {
    expect(parseBenchArgs(['--provider', 'fake', '--dataset', './set'])).toEqual({
      provider: 'fake',
      dataset: './set',
      runs: 1,
      json: false,
    })
  })

  it('parses runs and json', () => {
    expect(
      parseBenchArgs(['--provider', 'google-ai-studio', '--dataset', 'd', '--runs', '3', '--json']),
    ).toMatchObject({ provider: 'google-ai-studio', runs: 3, json: true })
  })

  it.each([
    [['--dataset', 'd']],
    [['--provider', 'disabled', '--dataset', 'd']],
    [['--provider', 'span-02', '--dataset', 'd']],
    [['--provider', 'fake']],
    [['--provider', 'fake', '--dataset', 'd', '--runs', '0']],
    [['--provider', 'fake', '--dataset', 'd', '--runs', 'x']],
    [['--provider', 'fake', '--dataset', 'd', '--unknown']],
  ])('rejects %p', (argv) => {
    expect(() => parseBenchArgs(argv)).toThrow()
  })
})
