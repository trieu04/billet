import { existsSync } from 'node:fs'
import { readDecisionConfig } from '../../../configs/app.config'
import { createDecisionProvider } from '../providers/factory'
import { parseBenchArgs, USAGE } from './args'
import { loadDataset } from './dataset'
import { formatReport } from './report'
import { runBenchmark } from './runner'

/**
 * Benchmark CLI: `pnpm --filter @billet/server bench:decision --provider <id> --dataset <dir>`.
 * Provider settings come from the same `EXPENSE_DECISION_*` variables as the server (an
 * `apps/server/.env` file is loaded when present; real environment variables win).
 */
async function main(): Promise<void> {
  const args = parseBenchArgs(process.argv.slice(2))
  if (existsSync('.env')) process.loadEnvFile('.env')

  const config = readDecisionConfig({ ...process.env, EXPENSE_DECISION_PROVIDER: args.provider })
  const provider = createDecisionProvider(config)
  const dataset = await loadDataset(args.dataset)

  const showProgress = !args.json && process.stderr.isTTY
  const result = await runBenchmark({
    dataset,
    provider,
    runs: args.runs,
    timeoutMs: config.timeoutMs,
    onAttempt: (done, total) => {
      if (showProgress) process.stderr.write(`\r${done}/${total}`)
    },
  })
  if (showProgress) process.stderr.write('\n')

  process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : formatReport(result)}\n`)
  if (result.successes === 0) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n${USAGE}\n`)
    process.exitCode = 1
  })
}
