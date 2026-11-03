import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { assertDecisionRefs } from '../decision-output'
import {
  DecisionProviderError,
  type DecisionInput,
  type DecisionProvider,
  type DecisionProviderErrorReason,
  type DecisionUsage,
} from '../interface'
import { compressForDecision, type ImageCompressor } from './compress'
import { buildChoiceSet, type Dataset } from './dataset'
import {
  calibrationTable,
  classificationReport,
  latencySummary,
  personalReport,
  usageSummary,
  type CalibrationSample,
  type CalibrationTable,
  type ClassificationReport,
  type LabelPair,
  type LatencySummary,
  type PersonalPair,
  type PersonalReport,
  type UsageSummary,
} from './metrics'

export const NO_CATEGORY = '(none)'

export interface BenchOptions {
  dataset: Dataset
  provider: DecisionProvider
  runs: number
  timeoutMs: number
  compress?: ImageCompressor
  /** Called after each attempt; used by the CLI for progress. */
  onAttempt?: (done: number, total: number) => void
}

export interface BenchResult {
  provider: { id: string; model: string }
  images: number
  runs: number
  attempts: number
  successes: number
  failures: Partial<Record<DecisionProviderErrorReason, number>>
  /** Images skipped because the compressed JPEG exceeds the provider's `maxImageBytes`. */
  oversizedImages: number
  compressedBytes: { mean: number | null; max: number | null }
  imageType: ClassificationReport
  category: ClassificationReport
  personal: PersonalReport
  imageTypeCalibration: CalibrationTable
  categoryCalibration: CalibrationTable
  /** Wall-clock `decide` time over all attempts, including failures and timeouts. */
  latencyMs: LatencySummary
  usage: UsageSummary
}

interface PreparedImage {
  bytes: Uint8Array
  imageType: string
  category: string
  personal: string | null
}

export async function runBenchmark(options: BenchOptions): Promise<BenchResult> {
  const { dataset, provider } = options
  const compress = options.compress ?? compressForDecision
  const choiceSet = buildChoiceSet(dataset)
  const choiceCount =
    choiceSet.choices.imageTypes.length +
    choiceSet.choices.categories.length +
    choiceSet.choices.personal.length
  if (choiceCount > provider.limits.maxChoices) {
    throw new Error(
      `Dataset has ${choiceCount} choices; provider allows ${provider.limits.maxChoices}`,
    )
  }

  const prepared: PreparedImage[] = []
  let oversizedImages = 0
  for (const image of dataset.images) {
    const bytes = await compress(await readFile(image.file))
    if (bytes.length > provider.limits.maxImageBytes) {
      oversizedImages++
      continue
    }
    prepared.push({
      bytes,
      imageType: image.imageType,
      category: image.category ?? NO_CATEGORY,
      personal: image.personal,
    })
  }
  if (prepared.length === 0) throw new Error('No images left to run after compression')

  const imageTypePairs: LabelPair[] = []
  const categoryPairs: LabelPair[] = []
  const personalPairs: PersonalPair[] = []
  const imageTypeSamples: CalibrationSample[] = []
  const categorySamples: CalibrationSample[] = []
  const latencies: number[] = []
  const usages: (DecisionUsage | undefined)[] = []
  const failures: BenchResult['failures'] = {}
  const total = prepared.length * options.runs
  let attempts = 0

  for (let run = 0; run < options.runs; run++) {
    for (const image of prepared) {
      const input: DecisionInput = {
        image: { bytes: image.bytes, mimeType: 'image/jpeg' },
        choices: choiceSet.choices,
        locale: dataset.locale,
      }
      const started = performance.now()
      try {
        const output = assertDecisionRefs(
          input.choices,
          await provider.decide(input, AbortSignal.timeout(options.timeoutMs)),
        )
        latencies.push(performance.now() - started)

        const imageType = choiceSet.imageTypeByRef.get(output.imageType.ref) ?? ''
        imageTypePairs.push({ expected: image.imageType, predicted: imageType })
        imageTypeSamples.push({
          confidence: output.imageType.confidence,
          correct: imageType === image.imageType,
        })

        const category = output.category
          ? (choiceSet.categoryByRef.get(output.category.ref) ?? NO_CATEGORY)
          : NO_CATEGORY
        categoryPairs.push({ expected: image.category, predicted: category })
        if (output.category) {
          categorySamples.push({
            confidence: output.category.confidence,
            correct: category === image.category,
          })
        }

        personalPairs.push({
          expected: image.personal,
          predicted: output.personal
            ? (choiceSet.personalByRef.get(output.personal.ref) ?? null)
            : null,
        })
        usages.push(output.usage)
      } catch (error: unknown) {
        latencies.push(performance.now() - started)
        const reason = error instanceof DecisionProviderError ? error.reason : 'provider_error'
        failures[reason] = (failures[reason] ?? 0) + 1
      }
      attempts++
      options.onAttempt?.(attempts, total)
    }
  }

  const sizes = prepared.map((image) => image.bytes.length)
  return {
    provider: { id: provider.id, model: provider.model },
    images: prepared.length,
    runs: options.runs,
    attempts,
    successes: imageTypePairs.length,
    failures,
    oversizedImages,
    compressedBytes: {
      mean: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      max: Math.max(...sizes),
    },
    imageType: classificationReport(imageTypePairs),
    category: classificationReport(categoryPairs),
    personal: personalReport(personalPairs),
    imageTypeCalibration: calibrationTable(imageTypeSamples),
    categoryCalibration: calibrationTable(categorySamples),
    latencyMs: latencySummary(latencies),
    usage: usageSummary(usages),
  }
}
