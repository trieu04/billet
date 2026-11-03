import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { DecisionInput } from '../interface'

export interface DatasetChoice {
  label: string
  description?: string
}

export interface DatasetImageType extends DatasetChoice {
  key: string
}

export interface DatasetImage {
  /** Absolute path, inside the dataset directory. */
  file: string
  /** Expected image type key. */
  imageType: string
  /** Expected category label, or null when no category fits. */
  category: string | null
  /** Expected personal choice label, or null. */
  personal: string | null
}

export interface Dataset {
  locale: string
  imageTypes: DatasetImageType[]
  categories: DatasetChoice[]
  personal: DatasetChoice[]
  images: DatasetImage[]
}

export const LABELS_FILE = 'labels.json'

export async function loadDataset(directory: string): Promise<Dataset> {
  const root = path.resolve(directory)
  let text: string
  try {
    text = await readFile(path.join(root, LABELS_FILE), 'utf8')
  } catch (error: unknown) {
    throw new Error(`Cannot read ${LABELS_FILE} in ${root}`, { cause: error })
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error: unknown) {
    throw new Error(`${LABELS_FILE} is not valid JSON`, { cause: error })
  }
  return parseDataset(json, root)
}

/** Validate the `labels.json` content and resolve image paths against `root`. */
export function parseDataset(json: unknown, root: string): Dataset {
  if (!isRecord(json)) throw datasetError('must be an object')
  const choices = isRecord(json.choices) ? json.choices : undefined
  if (!choices) throw datasetError('choices is required')

  const imageTypes = parseChoices(choices.imageTypes, 'choices.imageTypes', true).map(
    (choice): DatasetImageType => choice as DatasetImageType,
  )
  if (imageTypes.length === 0) throw datasetError('choices.imageTypes must not be empty')
  const keys = imageTypes.map((choice) => choice.key)
  assertUnique(keys, 'choices.imageTypes key')
  const categories = parseChoices(choices.categories ?? [], 'choices.categories', false)
  const personal = parseChoices(choices.personal ?? [], 'choices.personal', false)
  assertUnique(
    categories.map((choice) => choice.label),
    'choices.categories label',
  )
  assertUnique(
    personal.map((choice) => choice.label),
    'choices.personal label',
  )

  if (!Array.isArray(json.images) || json.images.length === 0) {
    throw datasetError('images must be a non-empty array')
  }
  const resolvedRoot = path.resolve(root)
  const images = json.images.map((value: unknown, index): DatasetImage => {
    const where = `images[${index}]`
    if (!isRecord(value)) throw datasetError(`${where} must be an object`)
    if (typeof value.file !== 'string' || value.file === '') {
      throw datasetError(`${where}.file must be a non-empty string`)
    }
    const file = path.resolve(resolvedRoot, value.file)
    if (!file.startsWith(resolvedRoot + path.sep)) {
      throw datasetError(`${where}.file must stay inside the dataset directory`)
    }
    if (typeof value.imageType !== 'string' || !keys.includes(value.imageType)) {
      throw datasetError(`${where}.imageType must be one of the imageTypes keys`)
    }
    return {
      file,
      imageType: value.imageType,
      category: expectedLabel(value.category, categories, `${where}.category`),
      personal: expectedLabel(value.personal, personal, `${where}.personal`),
    }
  })

  const locale = typeof json.locale === 'string' && json.locale !== '' ? json.locale : 'vi'
  return { locale, imageTypes, categories, personal, images }
}

export interface ChoiceSet {
  choices: DecisionInput['choices']
  /** `ref` -> image type key / category label / personal label. */
  imageTypeByRef: Map<string, string>
  categoryByRef: Map<string, string>
  personalByRef: Map<string, string>
}

/** Assign short request refs (`t1`, `c1`, `p1`, ...) and keep the reverse mapping. */
export function buildChoiceSet(dataset: Dataset): ChoiceSet {
  const imageTypeByRef = new Map<string, string>()
  const categoryByRef = new Map<string, string>()
  const personalByRef = new Map<string, string>()
  const toChoices = <T extends DatasetChoice>(
    items: readonly T[],
    prefix: string,
    target: Map<string, string>,
    identity: (item: T) => string,
  ) =>
    items.map((item, index) => {
      const ref = `${prefix}${index + 1}`
      target.set(ref, identity(item))
      return item.description === undefined
        ? { ref, label: item.label }
        : { ref, label: item.label, description: item.description }
    })
  return {
    choices: {
      imageTypes: toChoices(dataset.imageTypes, 't', imageTypeByRef, (item) => item.key),
      categories: toChoices(dataset.categories, 'c', categoryByRef, (item) => item.label),
      personal: toChoices(dataset.personal, 'p', personalByRef, (item) => item.label),
    },
    imageTypeByRef,
    categoryByRef,
    personalByRef,
  }
}

function parseChoices(value: unknown, where: string, withKey: boolean): DatasetChoice[] {
  if (!Array.isArray(value)) throw datasetError(`${where} must be an array`)
  return value.map((item: unknown, index): DatasetChoice => {
    const at = `${where}[${index}]`
    if (!isRecord(item)) throw datasetError(`${at} must be an object`)
    if (typeof item.label !== 'string' || item.label.trim() === '') {
      throw datasetError(`${at}.label must be a non-empty string`)
    }
    if (item.description !== undefined && typeof item.description !== 'string') {
      throw datasetError(`${at}.description must be a string`)
    }
    const choice: DatasetChoice = { label: item.label }
    if (item.description !== undefined) choice.description = item.description
    if (withKey) {
      if (typeof item.key !== 'string' || item.key.trim() === '') {
        throw datasetError(`${at}.key must be a non-empty string`)
      }
      return { ...choice, key: item.key } as DatasetImageType
    }
    return choice
  })
}

function expectedLabel(
  value: unknown,
  choices: readonly DatasetChoice[],
  where: string,
): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !choices.some((choice) => choice.label === value)) {
    throw datasetError(`${where} must match a label in the choice list or be null`)
  }
  return value
}

function assertUnique(values: readonly string[], what: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw datasetError(`duplicate ${what}`)
    seen.add(value)
  }
}

function datasetError(message: string): Error {
  return new Error(`Invalid ${LABELS_FILE}: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
