import type { ComponentProps } from 'react'
import type { Feather } from '@expo/vector-icons'

export type CategoryIcon = ComponentProps<typeof Feather>['name']

export const categoryColors = [
  '#F4B89C',
  '#F2CB70',
  '#9CCFB8',
  '#8DC8E8',
  '#B9AFE3',
  '#E99AA6',
  '#B5C67A',
  '#B9A38D',
] as const

export const categoryIcons: CategoryIcon[] = [
  'coffee',
  'navigation',
  'shopping-bag',
  'play-circle',
  'file-text',
  'heart',
  'book-open',
  'home',
  'gift',
  'map-pin',
  'smartphone',
  'tool',
  'star',
  'grid',
]

export function categoryIcon(value: string): CategoryIcon {
  return categoryIcons.includes(value as CategoryIcon) ? (value as CategoryIcon) : 'grid'
}
