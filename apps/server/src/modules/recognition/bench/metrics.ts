import type { DecisionUsage } from '../interface'

export interface LabelPair {
  expected: string
  predicted: string
}

export interface ClassMetrics {
  label: string
  precision: number
  recall: number
  f1: number
  /** Number of samples whose expected label is this class. */
  support: number
}

export interface ClassificationReport {
  total: number
  accuracy: number
  /** Unweighted mean F1 over the union of expected and predicted classes. */
  macroF1: number
  perClass: ClassMetrics[]
}

export function classificationReport(pairs: readonly LabelPair[]): ClassificationReport {
  const labels = [...new Set(pairs.flatMap((pair) => [pair.expected, pair.predicted]))].sort()
  const perClass = labels.map((label): ClassMetrics => {
    let truePositive = 0
    let falsePositive = 0
    let falseNegative = 0
    for (const { expected, predicted } of pairs) {
      if (predicted === label && expected === label) truePositive++
      else if (predicted === label) falsePositive++
      else if (expected === label) falseNegative++
    }
    const precision = ratio(truePositive, truePositive + falsePositive)
    const recall = ratio(truePositive, truePositive + falseNegative)
    return {
      label,
      precision,
      recall,
      f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
      support: truePositive + falseNegative,
    }
  })
  const correct = pairs.filter((pair) => pair.expected === pair.predicted).length
  return {
    total: pairs.length,
    accuracy: ratio(correct, pairs.length),
    macroF1:
      perClass.length === 0 ? 0 : sum(perClass.map((metrics) => metrics.f1)) / perClass.length,
    perClass,
  }
}

export interface PersonalPair {
  expected: string | null
  predicted: string | null
}

export interface PersonalReport {
  total: number
  /** Images where the model chose a personal choice. */
  predicted: number
  /** Chosen personal choices that match the expected label. */
  correct: number
  /** correct / predicted; null when the model never chose one. */
  precision: number | null
  /** Images that have an expected personal choice. */
  expected: number
  /** Share of expected personal choices that were predicted correctly; null when none expected. */
  recall: number | null
  /** predicted / total. */
  coverage: number
}

export function personalReport(pairs: readonly PersonalPair[]): PersonalReport {
  const predicted = pairs.filter((pair) => pair.predicted !== null)
  const correct = predicted.filter((pair) => pair.predicted === pair.expected).length
  const expected = pairs.filter((pair) => pair.expected !== null).length
  return {
    total: pairs.length,
    predicted: predicted.length,
    correct,
    precision: predicted.length === 0 ? null : correct / predicted.length,
    expected,
    recall: expected === 0 ? null : correct / expected,
    coverage: ratio(predicted.length, pairs.length),
  }
}

export interface CalibrationSample {
  confidence: number
  correct: boolean
}

export interface CalibrationBucket {
  from: number
  to: number
  count: number
  meanConfidence: number | null
  accuracy: number | null
}

export interface CalibrationTable {
  buckets: CalibrationBucket[]
  /** Expected calibration error: count-weighted mean |accuracy - confidence| over buckets. */
  ece: number | null
}

/** Equal-width confidence buckets over [0, 1]; the last bucket includes 1. */
export function calibrationTable(
  samples: readonly CalibrationSample[],
  bucketCount = 10,
): CalibrationTable {
  const groups: CalibrationSample[][] = Array.from({ length: bucketCount }, () => [])
  for (const sample of samples) {
    const clamped = Math.min(1, Math.max(0, sample.confidence))
    groups[Math.min(bucketCount - 1, Math.floor(clamped * bucketCount))].push(sample)
  }
  const buckets = groups.map((group, index): CalibrationBucket => {
    const count = group.length
    return {
      from: index / bucketCount,
      to: (index + 1) / bucketCount,
      count,
      meanConfidence: count === 0 ? null : sum(group.map((s) => s.confidence)) / count,
      accuracy: count === 0 ? null : group.filter((s) => s.correct).length / count,
    }
  })
  const ece =
    samples.length === 0
      ? null
      : sum(
          buckets.map((bucket) =>
            bucket.count === 0 || bucket.meanConfidence === null || bucket.accuracy === null
              ? 0
              : bucket.count * Math.abs(bucket.accuracy - bucket.meanConfidence),
          ),
        ) / samples.length
  return { buckets, ece }
}

/** Nearest-rank percentile (`p` in 0..100); null for an empty list. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
  return sorted[Math.min(sorted.length, rank) - 1]
}

export interface LatencySummary {
  count: number
  p50: number | null
  p95: number | null
  mean: number | null
  max: number | null
}

export function latencySummary(latenciesMs: readonly number[]): LatencySummary {
  return {
    count: latenciesMs.length,
    p50: percentile(latenciesMs, 50),
    p95: percentile(latenciesMs, 95),
    mean: latenciesMs.length === 0 ? null : sum(latenciesMs) / latenciesMs.length,
    max: latenciesMs.length === 0 ? null : Math.max(...latenciesMs),
  }
}

export interface UsageSummary {
  /** Successful decisions that reported usage with a cost. */
  costSamples: number
  meanCostMicroUsd: number | null
  totalCostMicroUsd: number | null
  meanInputTokens: number | null
  meanOutputTokens: number | null
}

export function usageSummary(usages: readonly (DecisionUsage | undefined)[]): UsageSummary {
  const costs = collect(usages, 'costMicroUsd')
  return {
    costSamples: costs.length,
    meanCostMicroUsd: mean(costs),
    totalCostMicroUsd: costs.length === 0 ? null : sum(costs),
    meanInputTokens: mean(collect(usages, 'inputTokens')),
    meanOutputTokens: mean(collect(usages, 'outputTokens')),
  }
}

function collect(
  usages: readonly (DecisionUsage | undefined)[],
  key: keyof DecisionUsage,
): number[] {
  const values: number[] = []
  for (const usage of usages) {
    const value = usage?.[key]
    if (value !== undefined) values.push(value)
  }
  return values
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}
