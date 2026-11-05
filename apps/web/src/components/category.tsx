/* oxlint-disable react/only-export-components, react/static-components */
import {
  BookOpen,
  Coffee,
  FileText,
  Gift,
  Heart,
  House,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Navigation,
  CirclePlay,
  ShoppingBag,
  Smartphone,
  Star,
  Wrench,
} from 'lucide-react'

export type Category = {
  id: string
  code: string
  name: string
  color: string
  icon: string
  sortOrder: number
  usageCount: number
  isCustom: boolean
}

export const CATEGORY_ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'coffee', label: 'Cà phê', icon: Coffee },
  { value: 'shopping-bag', label: 'Mua sắm', icon: ShoppingBag },
  { value: 'home', label: 'Nhà cửa', icon: House },
  { value: 'navigation', label: 'Di chuyển', icon: Navigation },
  { value: 'map-pin', label: 'Địa điểm', icon: MapPin },
  { value: 'book-open', label: 'Học tập', icon: BookOpen },
  { value: 'heart', label: 'Sức khỏe', icon: Heart },
  { value: 'gift', label: 'Quà tặng', icon: Gift },
  { value: 'play-circle', label: 'Giải trí', icon: CirclePlay },
  { value: 'smartphone', label: 'Điện thoại', icon: Smartphone },
  { value: 'file-text', label: 'Hóa đơn', icon: FileText },
  { value: 'tool', label: 'Sửa chữa', icon: Wrench },
  { value: 'star', label: 'Yêu thích', icon: Star },
  { value: 'grid', label: 'Khác', icon: LayoutGrid },
]

export const CATEGORY_COLORS = [
  '#F4B89C',
  '#F6C85F',
  '#B7C9AB',
  '#9CC5D8',
  '#C9B6E4',
  '#E8A5B8',
  '#D9B48F',
  '#A7D3C4',
]

const ICONS = new Map(CATEGORY_ICON_OPTIONS.map((option) => [option.value, option.icon]))

export function iconFor(name: string): LucideIcon {
  return ICONS.get(name) ?? LayoutGrid
}

/** Round badge showing a category's icon on its own colour. */
export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: Pick<Category, 'color' | 'icon'> | null | undefined
  size?: 'sm' | 'md' | 'lg'
}) {
  const Icon = iconFor(category?.icon ?? 'grid')
  const box = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10'
  const glyph = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full text-ink ${box}`}
      style={{ backgroundColor: category?.color ?? '#efe8dc' }}
    >
      <Icon className={glyph} />
    </span>
  )
}

export function CategoryChip({ category }: { category: Category | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      <span
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ backgroundColor: category?.color ?? '#cfc3b6' }}
      />
      {category?.name ?? 'Chưa phân loại'}
    </span>
  )
}
