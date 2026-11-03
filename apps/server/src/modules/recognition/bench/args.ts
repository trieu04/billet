import { parseArgs } from 'node:util'
import { DECISION_PROVIDER_IDS, type DecisionProviderId } from '../../../configs/environment'

export interface BenchArgs {
  provider: DecisionProviderId
  dataset: string
  runs: number
  json: boolean
}

export const USAGE =
  'Usage: pnpm --filter @billet/server bench:decision --provider <fake|google-ai-studio|openai-compatible> --dataset <dir> [--runs <n>] [--json]'

export function parseBenchArgs(argv: readonly string[]): BenchArgs {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    options: {
      provider: { type: 'string' },
      dataset: { type: 'string' },
      runs: { type: 'string', default: '1' },
      json: { type: 'boolean', default: false },
    },
  })

  const provider = DECISION_PROVIDER_IDS.find((id) => id === values.provider)
  if (!provider || provider === 'disabled') {
    throw new Error(
      `--provider must be one of: ${DECISION_PROVIDER_IDS.filter((id) => id !== 'disabled').join(', ')}`,
    )
  }
  if (!values.dataset) throw new Error('--dataset <dir> is required')
  const runs = Number(values.runs)
  if (!Number.isInteger(runs) || runs < 1 || runs > 100) {
    throw new Error('--runs must be an integer between 1 and 100')
  }
  return { provider, dataset: values.dataset, runs, json: values.json === true }
}
