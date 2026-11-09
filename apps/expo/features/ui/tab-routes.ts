export type TabKey = 'grid' | 'journal' | 'statistics'

/** Tabs in display order. */
export const tabRoutes: Array<{ key: TabKey; label: string; route: string }> = [
  { key: 'grid', label: 'Bảng', route: '/calendar' },
  { key: 'journal', label: 'Nhật ký', route: '/' },
  { key: 'statistics', label: 'Thống kê', route: '/statistics' },
]
