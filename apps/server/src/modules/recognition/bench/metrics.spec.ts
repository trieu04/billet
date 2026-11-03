import {
  calibrationTable,
  classificationReport,
  latencySummary,
  percentile,
  personalReport,
  usageSummary,
} from './metrics'

describe('classificationReport', () => {
  it('computes accuracy, per-class precision/recall and macro-F1', () => {
    const report = classificationReport([
      { expected: 'a', predicted: 'a' },
      { expected: 'a', predicted: 'a' },
      { expected: 'a', predicted: 'b' },
      { expected: 'b', predicted: 'b' },
    ])
    expect(report.accuracy).toBeCloseTo(0.75)
    const a = report.perClass.find((metrics) => metrics.label === 'a')
    const b = report.perClass.find((metrics) => metrics.label === 'b')
    expect(a).toMatchObject({ precision: 1, support: 3 })
    expect(a?.recall).toBeCloseTo(2 / 3)
    expect(a?.f1).toBeCloseTo(0.8)
    expect(b?.precision).toBeCloseTo(0.5)
    expect(b?.recall).toBe(1)
    expect(b?.f1).toBeCloseTo(2 / 3)
    expect(report.macroF1).toBeCloseTo((0.8 + 2 / 3) / 2)
  })

  it('counts predicted-only classes with zero F1 in the macro average', () => {
    const report = classificationReport([
      { expected: 'a', predicted: 'a' },
      { expected: 'a', predicted: '(none)' },
    ])
    expect(report.perClass.map((metrics) => metrics.label)).toEqual(['(none)', 'a'])
    expect(report.macroF1).toBeCloseTo((0 + 2 / 3) / 2)
  })

  it('handles an empty sample', () => {
    expect(classificationReport([])).toEqual({ total: 0, accuracy: 0, macroF1: 0, perClass: [] })
  })
})

describe('personalReport', () => {
  it('reports precision over predictions, recall over expectations and coverage', () => {
    const report = personalReport([
      { expected: 'p', predicted: 'p' },
      { expected: 'p', predicted: 'q' },
      { expected: 'p', predicted: null },
      { expected: null, predicted: 'p' },
      { expected: null, predicted: null },
    ])
    expect(report).toMatchObject({ total: 5, predicted: 3, correct: 1, expected: 3 })
    expect(report.precision).toBeCloseTo(1 / 3)
    expect(report.recall).toBeCloseTo(1 / 3)
    expect(report.coverage).toBeCloseTo(3 / 5)
  })

  it('returns null precision and recall when undefined', () => {
    expect(personalReport([{ expected: null, predicted: null }])).toMatchObject({
      precision: null,
      recall: null,
      coverage: 0,
    })
  })
})

describe('calibrationTable', () => {
  it('buckets confidences and reports accuracy per bucket and ECE', () => {
    const table = calibrationTable(
      [
        { confidence: 0.95, correct: true },
        { confidence: 0.9, correct: false },
        { confidence: 1, correct: true },
        { confidence: 0.1, correct: false },
      ],
      10,
    )
    expect(table.buckets).toHaveLength(10)
    const top = table.buckets[9]
    expect(top.count).toBe(3)
    expect(top.accuracy).toBeCloseTo(2 / 3)
    expect(top.meanConfidence).toBeCloseTo(0.95)
    expect(table.buckets[1].count).toBe(1)
    expect(table.buckets[5]).toMatchObject({ count: 0, accuracy: null, meanConfidence: null })
    // ECE = (3 * |2/3 - 0.95| + 1 * |0 - 0.1|) / 4
    expect(table.ece).toBeCloseTo((3 * Math.abs(2 / 3 - 0.95) + 0.1) / 4)
  })

  it('returns a null ECE without samples', () => {
    expect(calibrationTable([]).ece).toBeNull()
  })
})

describe('percentile and latencySummary', () => {
  it('uses nearest-rank percentiles', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(values, 50)).toBe(50)
    expect(percentile(values, 95)).toBe(95)
    expect(percentile([5, 1, 3], 50)).toBe(3)
    expect(percentile([7], 95)).toBe(7)
    expect(percentile([], 50)).toBeNull()
  })

  it('summarizes latencies', () => {
    expect(latencySummary([100, 200, 300, 400])).toEqual({
      count: 4,
      p50: 200,
      p95: 400,
      mean: 250,
      max: 400,
    })
    expect(latencySummary([])).toMatchObject({ count: 0, p50: null, p95: null })
  })
})

describe('usageSummary', () => {
  it('averages only the reported values', () => {
    expect(
      usageSummary([
        { inputTokens: 100, outputTokens: 10, costMicroUsd: 40 },
        { inputTokens: 300 },
        undefined,
        { costMicroUsd: 60 },
      ]),
    ).toEqual({
      costSamples: 2,
      meanCostMicroUsd: 50,
      totalCostMicroUsd: 100,
      meanInputTokens: 200,
      meanOutputTokens: 10,
    })
  })

  it('returns nulls when nothing was reported', () => {
    expect(usageSummary([undefined])).toEqual({
      costSamples: 0,
      meanCostMicroUsd: null,
      totalCostMicroUsd: null,
      meanInputTokens: null,
      meanOutputTokens: null,
    })
  })
})
