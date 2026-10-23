import type { ExpenseList } from '@/features/api/types'

type LoadPage = (cursor: string | null) => Promise<ExpenseList>

export async function loadAllJournalPages(loadPage: LoadPage): Promise<ExpenseList> {
  const data: ExpenseList['data'] = []
  const seenCursors = new Set<string>()
  let cursor: string | null = null
  let totals: ExpenseList['totals'] = []
  let firstPage = true

  do {
    const page = await loadPage(cursor)
    data.push(...page.data)
    if (firstPage) {
      totals = page.totals
      firstPage = false
    }

    cursor = page.nextCursor
    if (cursor) {
      if (seenCursors.has(cursor)) throw new Error('Journal pagination returned a repeated cursor')
      seenCursors.add(cursor)
    }
  } while (cursor)

  return { data, totals, nextCursor: null }
}
