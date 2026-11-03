import type { DecisionChoice, DecisionInput } from '../interface'

const SELECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ref', 'confidence'],
  properties: {
    ref: { type: 'string', description: 'A ref from the matching list.' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const

/** JSON Schema of the model's answer; `category` and `personal` may be null. */
export const DECISION_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['imageType', 'category', 'personal'],
  properties: {
    imageType: SELECTION_SCHEMA,
    category: { anyOf: [SELECTION_SCHEMA, { type: 'null' }] },
    personal: { anyOf: [SELECTION_SCHEMA, { type: 'null' }] },
  },
} as const

export const DECISION_SYSTEM_INSTRUCTION =
  'You classify a photo taken for an expense journal. Choose only from the lists supplied by the user and answer with a single JSON object, no prose.'

/** Build the user-facing text prompt: one `ref: label - description` line per choice. */
export function buildDecisionPrompt(input: DecisionInput): string {
  const { imageTypes, categories, personal } = input.choices
  return [
    `Classify the attached photo. Write labels and reasoning-free answers for locale "${input.locale}".`,
    '',
    'Pick exactly one image type.',
    formatList('imageTypes', imageTypes),
    '',
    'Pick the expense category that best fits the photo, or null when none clearly fits.',
    formatList('categories', categories),
    '',
    'Pick one personal choice when the photo clearly matches it, otherwise null.',
    formatList('personal', personal),
    '',
    'Rules:',
    '- Answer with refs exactly as listed (for example "t3"); never invent a ref or use a label.',
    '- Use null for category or personal when unsure or when the list is empty; do not guess.',
    '- confidence is your probability (0 to 1) that the chosen ref is correct.',
    '- Output shape: {"imageType":{"ref":string,"confidence":number},"category":{"ref":string,"confidence":number}|null,"personal":{"ref":string,"confidence":number}|null}',
  ].join('\n')
}

function formatList(name: string, choices: readonly DecisionChoice[]): string {
  if (choices.length === 0) return `${name}: (empty)`
  const lines = choices.map(
    (choice) =>
      `- ${choice.ref}: ${choice.label}${choice.description ? ` - ${choice.description}` : ''}`,
  )
  return [`${name}:`, ...lines].join('\n')
}
