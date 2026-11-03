import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { DecisionProviderError, type DecisionInput, type DecisionOutput } from '../interface'
import { FakeDecisionProvider } from '../providers/fake.provider'
import { COMPRESSION, compressForDecision } from './compress'
import { loadDataset } from './dataset'
import { formatReport } from './report'
import { runBenchmark } from './runner'

const LABELS = {
  locale: 'en',
  choices: {
    imageTypes: [
      { key: 'receipt', label: 'Receipt', description: 'Printed bill' },
      { key: 'food', label: 'Food' },
    ],
    categories: [{ label: 'Eating out' }, { label: 'Transport' }],
    personal: [{ label: 'Parking' }],
  },
  images: [
    { file: 'one.jpg', imageType: 'receipt', category: 'Eating out', personal: 'Parking' },
    { file: 'two.jpg', imageType: 'food', category: 'Eating out' },
    { file: 'three.jpg', imageType: 'food', category: 'Transport' },
  ],
}

async function solidJpeg(width: number, height: number, red: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: red, g: 80, b: 40 } } })
    .jpeg()
    .toBuffer()
}

describe('decision benchmark', () => {
  let directory: string

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'billet-bench-'))
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'labels.json'), JSON.stringify(LABELS))
    await writeFile(path.join(directory, 'one.jpg'), await solidJpeg(2400, 1200, 10))
    await writeFile(path.join(directory, 'two.jpg'), await solidJpeg(600, 900, 120))
    await writeFile(path.join(directory, 'three.jpg'), await solidJpeg(1500, 1500, 230))
  })

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('runs end to end with the fake provider', async () => {
    const dataset = await loadDataset(directory)
    const provider = new FakeDecisionProvider({
      maxImageBytes: 1_048_576,
      latencyMs: 5,
      output: (input: DecisionInput): DecisionOutput => ({
        imageType: { ref: 't2', confidence: 0.8 },
        category: { ref: input.choices.categories[0].ref, confidence: 0.6 },
        personal: null,
        usage: { inputTokens: 100, outputTokens: 10, costMicroUsd: 50 },
      }),
    })

    const result = await runBenchmark({ dataset, provider, runs: 2, timeoutMs: 1_000 })

    expect(result).toMatchObject({ images: 3, runs: 2, attempts: 6, successes: 6, failures: {} })
    // image type: always 'food' -> 2 of 3 images correct
    expect(result.imageType.accuracy).toBeCloseTo(2 / 3)
    // category: always 'Eating out' -> 2 of 3 correct
    expect(result.category.accuracy).toBeCloseTo(2 / 3)
    expect(result.personal).toMatchObject({ predicted: 0, precision: null, expected: 2 })
    expect(result.latencyMs.p50).toBeGreaterThanOrEqual(4)
    expect(result.usage).toMatchObject({ meanCostMicroUsd: 50, totalCostMicroUsd: 300 })
    expect(result.imageTypeCalibration.buckets[8]).toMatchObject({ count: 6 })
    expect(formatReport(result)).toContain('macro-F1')
  })

  it('compresses the same way as the client', async () => {
    const compressed = await compressForDecision(await readFile(path.join(directory, 'one.jpg')))
    const meta = await sharp(compressed).metadata()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(COMPRESSION.longEdgePx)
    expect(meta.format).toBe('jpeg')
    expect(meta.exif).toBeUndefined()
  })

  it('counts provider failures and invalid output without aborting the run', async () => {
    const dataset = await loadDataset(directory)
    let call = 0
    const provider = new FakeDecisionProvider({
      maxImageBytes: 1_048_576,
      output: () => {
        call++
        if (call === 1) throw new DecisionProviderError('provider_rate_limited')
        if (call === 2) {
          return { imageType: { ref: 't9', confidence: 1 }, category: null, personal: null }
        }
        return { imageType: { ref: 't1', confidence: 0.9 }, category: null, personal: null }
      },
    })

    const result = await runBenchmark({ dataset, provider, runs: 1, timeoutMs: 1_000 })

    expect(result.successes).toBe(1)
    expect(result.failures).toEqual({ provider_rate_limited: 1, invalid_output: 1 })
  })

  it('records timeouts from a slow provider', async () => {
    const dataset = await loadDataset(directory)
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, latencyMs: 10_000 })
    const result = await runBenchmark({ dataset, provider, runs: 1, timeoutMs: 20 })
    expect(result.successes).toBe(0)
    expect(result.failures).toEqual({ timeout: 3 })
    expect(result.latencyMs.p95).toBeLessThan(1_000)
  })

  it('skips images above the provider size limit', async () => {
    const dataset = await loadDataset(directory)
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_024 })
    const sizes = [2_000, 500, 500]
    let index = 0
    const result = await runBenchmark({
      dataset,
      provider,
      runs: 1,
      timeoutMs: 1_000,
      compress: async () => new Uint8Array(sizes[index++]),
    })
    expect(result).toMatchObject({ images: 2, oversizedImages: 1, attempts: 2 })

    await expect(
      runBenchmark({
        dataset,
        provider,
        runs: 1,
        timeoutMs: 1_000,
        compress: async () => new Uint8Array(2_000),
      }),
    ).rejects.toThrow('No images left')
  })
})
