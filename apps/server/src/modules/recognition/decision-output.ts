import {
  DecisionProviderError,
  type DecisionChoice,
  type DecisionInput,
  type DecisionOutput,
} from './interface'

type DecisionSelection = { ref: string; confidence: number }
export type DecisionSelections = Pick<DecisionOutput, 'imageType' | 'category' | 'personal'>

/**
 * Narrow untyped provider JSON to the three selections. Refs are only checked to be strings here;
 * use {@link assertDecisionRefs} to check them against the request's choice set.
 */
export function parseDecisionSelections(value: unknown): DecisionSelections {
  if (!isRecord(value)) throw invalid('result must be an object')
  const imageType = parseSelection(value.imageType, 'imageType')
  if (imageType === null) throw invalid('imageType is required')
  return {
    imageType,
    category: parseSelection(value.category, 'category'),
    personal: parseSelection(value.personal, 'personal'),
  }
}

/** Parse the text of a provider response (tolerates a Markdown code fence) into selections. */
export function parseDecisionText(text: string): DecisionSelections {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFence(text))
  } catch (error: unknown) {
    throw new DecisionProviderError('invalid_output', 'Decision output was not valid JSON', {
      cause: error,
    })
  }
  return parseDecisionSelections(parsed)
}

/**
 * Verify that every returned ref belongs to the matching list of the request. Throws
 * `invalid_output` otherwise. Returns the output unchanged so callers can chain it.
 */
export function assertDecisionRefs(
  choices: DecisionInput['choices'],
  output: DecisionOutput,
): DecisionOutput {
  assertRef(choices.imageTypes, output.imageType, 'imageType')
  if (output.category) assertRef(choices.categories, output.category, 'category')
  if (output.personal) assertRef(choices.personal, output.personal, 'personal')
  return output
}

function assertRef(
  choices: readonly DecisionChoice[],
  selection: DecisionSelection,
  field: string,
): void {
  if (!choices.some((choice) => choice.ref === selection.ref)) {
    throw invalid(`${field} ref is not in the choice set`)
  }
}

function parseSelection(value: unknown, field: string): DecisionSelection | null {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) throw invalid(`${field} must be an object or null`)
  if (typeof value.ref !== 'string' || value.ref.length === 0) {
    throw invalid(`${field}.ref must be a non-empty string`)
  }
  const { confidence } = value
  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw invalid(`${field}.confidence must be a number between 0 and 1`)
  }
  return { ref: value.ref, confidence }
}

function stripCodeFence(text: string): string {
  const match = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(text)
  return match ? match[1] : text
}

function invalid(message: string): DecisionProviderError {
  return new DecisionProviderError('invalid_output', `Invalid decision output: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
