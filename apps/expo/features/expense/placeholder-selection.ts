// Each motif has several colour variants. The capture strip shows every motif once, in a
// fixed order, with a randomly chosen variant.
export function pickVariantPerMotif<T extends { motifId: string }>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = groups.get(item.motifId)
    if (group) group.push(item)
    else groups.set(item.motifId, [item])
  }
  return [...groups.values()].map(
    (group) => group[Math.min(group.length - 1, Math.floor(random() * group.length))] as T,
  )
}
