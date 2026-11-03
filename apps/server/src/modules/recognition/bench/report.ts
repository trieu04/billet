import type { CalibrationTable, ClassificationReport } from './metrics'
import type { BenchResult } from './runner'

export function formatReport(result: BenchResult): string {
  const lines: string[] = []
  const failed = result.attempts - result.successes
  lines.push(
    `Decision benchmark: ${result.provider.id} (${result.provider.model})`,
    `Images: ${result.images} x ${result.runs} run(s) = ${result.attempts} attempts; ok ${result.successes}, failed ${failed}${formatFailures(result.failures)}`,
  )
  if (result.oversizedImages > 0) {
    lines.push(`Skipped ${result.oversizedImages} image(s) above the provider size limit`)
  }
  lines.push(
    `Compressed JPEG: mean ${formatKb(result.compressedBytes.mean)}, max ${formatKb(result.compressedBytes.max)}`,
    '',
    ...formatClassification('Image type', result.imageType),
    '',
    ...formatClassification('Category', result.category),
    '',
    'Personal choice',
    `  precision ${percent(result.personal.precision)} (${result.personal.correct}/${result.personal.predicted} chosen), recall ${percent(result.personal.recall)} (${result.personal.expected} expected), coverage ${percent(result.personal.coverage)}`,
    '',
    ...formatCalibration('Calibration: image type', result.imageTypeCalibration),
    '',
    ...formatCalibration(
      'Calibration: category (non-null predictions)',
      result.categoryCalibration,
    ),
    '',
    'Latency (ms, all attempts)',
    `  P50 ${fixed(result.latencyMs.p50)}  P95 ${fixed(result.latencyMs.p95)}  mean ${fixed(result.latencyMs.mean)}  max ${fixed(result.latencyMs.max)}`,
    '',
    'Usage and cost',
    `  tokens/image: input ${fixed(result.usage.meanInputTokens)}, output ${fixed(result.usage.meanOutputTokens)}`,
    `  cost/image: ${formatCost(result.usage.meanCostMicroUsd)} (${result.usage.costSamples} sample(s) with cost; total ${formatCost(result.usage.totalCostMicroUsd)})`,
  )
  return lines.join('\n')
}

function formatClassification(title: string, report: ClassificationReport): string[] {
  const lines = [
    title,
    `  accuracy ${percent(report.accuracy)}  macro-F1 ${report.macroF1.toFixed(3)}  (n=${report.total})`,
  ]
  for (const metrics of report.perClass) {
    lines.push(
      `  - ${metrics.label}: P ${metrics.precision.toFixed(2)} R ${metrics.recall.toFixed(2)} F1 ${metrics.f1.toFixed(2)} n=${metrics.support}`,
    )
  }
  return lines
}

function formatCalibration(title: string, table: CalibrationTable): string[] {
  const lines = [title, '  confidence   n  mean conf  accuracy']
  for (const bucket of table.buckets) {
    if (bucket.count === 0) continue
    const range = `${bucket.from.toFixed(1)}-${bucket.to.toFixed(1)}`
    lines.push(
      `  ${range.padEnd(10)} ${String(bucket.count).padStart(3)}  ${fixed(bucket.meanConfidence, 2).padStart(9)}  ${percent(bucket.accuracy).padStart(8)}`,
    )
  }
  lines.push(`  ECE ${fixed(table.ece, 3)}`)
  return lines
}

function formatFailures(failures: BenchResult['failures']): string {
  const entries = Object.entries(failures)
  return entries.length === 0
    ? ''
    : ` (${entries.map(([reason, n]) => `${reason}=${n}`).join(', ')})`
}

function formatCost(micro: number | null): string {
  return micro === null ? 'n/a' : `$${(micro / 1_000_000).toFixed(6)}`
}

function formatKb(bytes: number | null): string {
  return bytes === null ? 'n/a' : `${(bytes / 1024).toFixed(0)} KB`
}

function percent(value: number | null): string {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`
}

function fixed(value: number | null, digits = 0): string {
  return value === null ? 'n/a' : value.toFixed(digits)
}
