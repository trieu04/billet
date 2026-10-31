export type TabKey = 'grid' | 'journal' | 'statistics'

/** Tabs in display order. */
export const tabRoutes: Array<{ key: TabKey; route: string }> = [
  { key: 'grid', route: '/calendar' },
  { key: 'journal', route: '/' },
  { key: 'statistics', route: '/statistics' },
]
