import { createHash } from 'node:crypto'
import { MAX_PERSONAL_CHOICES_PER_REQUEST } from '../constants'
import type { DecisionChoice, DecisionInput, DecisionOutput } from '../interface'

export interface ImageTypeSource {
  key: string
  label: string
  description: string | null
}

export interface CategorySource {
  id: string
  label: string
}

export interface PersonalChoiceSource {
  id: string
  label: string
  description: string | null
  placeKey: string | null
  lastSelectedAt: Date | null
}

export type ChoiceTarget =
  | { kind: 'image_type'; key: string }
  | { kind: 'category'; id: string }
  | { kind: 'personal'; id: string }

export interface ChoiceSet {
  choices: DecisionInput['choices']
  /** Request-scoped ref → database id (or image type key). Never sent to the provider. */
  targets: ReadonlyMap<string, ChoiceTarget>
  /** Short hash of the offered choices, stored with each inference. */
  version: string
}

export interface ChoiceSetSources {
  imageTypes: readonly ImageTypeSource[]
  categories: readonly CategorySource[]
  personal: readonly PersonalChoiceSource[]
  /** Personal choices with this place key are offered first. */
  placeKey?: string | null
  /** Upper bound on the total number of choices (provider limit). */
  maxChoices: number
  maxPersonal?: number
}

/**
 * Order and cap the sources, give each choice a short ref (`t1`, `c1`, `p1`, …) and compute the
 * choice set version. Image types always fit; categories come next, personal choices take what is
 * left (at most {@link MAX_PERSONAL_CHOICES_PER_REQUEST}).
 */
export function assembleChoiceSet(sources: ChoiceSetSources): ChoiceSet {
  const targets = new Map<string, ChoiceTarget>()
  const imageTypes = sources.imageTypes.map((type, index): DecisionChoice => {
    const ref = `t${index + 1}`
    targets.set(ref, { kind: 'image_type', key: type.key })
    return withDescription(ref, type.label, type.description)
  })
  const categoryRoom = Math.max(0, sources.maxChoices - imageTypes.length)
  const categories = sources.categories.slice(0, categoryRoom).map((category, index) => {
    const ref = `c${index + 1}`
    targets.set(ref, { kind: 'category', id: category.id })
    return withDescription(ref, category.label, null)
  })
  const personalRoom = Math.max(
    0,
    Math.min(
      sources.maxPersonal ?? MAX_PERSONAL_CHOICES_PER_REQUEST,
      sources.maxChoices - imageTypes.length - categories.length,
    ),
  )
  const personal = rankPersonalChoices(sources.personal, sources.placeKey ?? null)
    .slice(0, personalRoom)
    .map((choice, index) => {
      const ref = `p${index + 1}`
      targets.set(ref, { kind: 'personal', id: choice.id })
      return withDescription(ref, choice.label, choice.description)
    })

  const choices = { imageTypes, categories, personal }
  const version = createHash('sha256')
    .update(JSON.stringify({ targets: [...targets], choices }))
    .digest('hex')
    .slice(0, 16)
  return { choices, targets, version }
}

/** Same place key first, then most recently selected, then newest. */
export function rankPersonalChoices(
  choices: readonly PersonalChoiceSource[],
  placeKey: string | null,
): PersonalChoiceSource[] {
  return [...choices].sort((a, b) => {
    const place = Number(samePlace(b, placeKey)) - Number(samePlace(a, placeKey))
    if (place !== 0) return place
    const selected = (b.lastSelectedAt?.getTime() ?? 0) - (a.lastSelectedAt?.getTime() ?? 0)
    if (selected !== 0) return selected
    return compareIdsDesc(a.id, b.id)
  })
}

export interface MappedSelection {
  id: string
  confidence: number
}

export interface MappedDecision {
  /** `id` is the image type key. */
  imageType: MappedSelection
  category: MappedSelection | null
  personalChoice: MappedSelection | null
}

/** Translate validated refs back to ids. Call after `assertDecisionRefs`. */
export function mapDecisionOutput(set: ChoiceSet, output: DecisionOutput): MappedDecision {
  const imageType = set.targets.get(output.imageType.ref)
  if (imageType?.kind !== 'image_type') throw new Error('imageType ref is not an image type')
  return {
    imageType: { id: imageType.key, confidence: output.imageType.confidence },
    category: mapSelection(set, output.category, 'category'),
    personalChoice: mapSelection(set, output.personal, 'personal'),
  }
}

function mapSelection(
  set: ChoiceSet,
  selection: { ref: string; confidence: number } | null,
  kind: 'category' | 'personal',
): MappedSelection | null {
  if (!selection) return null
  const target = set.targets.get(selection.ref)
  if (target?.kind !== kind) throw new Error(`${kind} ref is not a ${kind} choice`)
  return { id: target.id, confidence: selection.confidence }
}

function samePlace(choice: PersonalChoiceSource, placeKey: string | null): boolean {
  return placeKey !== null && choice.placeKey === placeKey
}

function compareIdsDesc(a: string, b: string): number {
  const left = BigInt(a)
  const right = BigInt(b)
  return left === right ? 0 : left > right ? -1 : 1
}

function withDescription(ref: string, label: string, description: string | null): DecisionChoice {
  return description ? { ref, label, description } : { ref, label }
}
