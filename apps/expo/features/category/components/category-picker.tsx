import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Category } from '@/features/api/types'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { categoryIcon } from '../category-options'
import { CategoryFormModal } from './category-form-modal'

export function CategoryPicker({
  categories,
  disabled,
  onCreated,
  onSelect,
  selectedId,
}: {
  categories: Category[]
  disabled?: boolean
  onCreated(category: Category): void
  onSelect(categoryId: string): void
  selectedId?: string
}) {
  const [creating, setCreating] = useState(false)

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((category) => {
          const selected = selectedId === category.id
          return (
            <AnimatedPressable
              accessibilityLabel={category.name}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[styles.item, selected && styles.selectedItem]}
            >
              <View style={[styles.icon, { backgroundColor: category.color }]}>
                <Feather color={colors.text} name={categoryIcon(category.icon)} size={20} />
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {category.name}
              </Text>
              {selected ? (
                <View style={styles.check}>
                  <Feather color="white" name="check" size={11} />
                </View>
              ) : null}
            </AnimatedPressable>
          )
        })}
        <AnimatedPressable
          accessibilityLabel="Thêm danh mục"
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setCreating(true)}
          style={[styles.item, styles.addItem]}
        >
          <View style={[styles.icon, styles.addIcon]}>
            <Feather color={colors.link} name="plus" size={22} />
          </View>
          <Text numberOfLines={1} style={[styles.name, styles.addName]}>
            Thêm
          </Text>
        </AnimatedPressable>
      </ScrollView>
      <CategoryFormModal
        onDismiss={() => setCreating(false)}
        onSaved={onCreated}
        visible={creating}
      />
    </>
  )
}

const styles = StyleSheet.create({
  addIcon: { backgroundColor: colors.chip, borderColor: colors.line, borderWidth: 1 },
  addItem: { borderStyle: 'dashed' },
  addName: { color: colors.link },
  check: {
    alignItems: 'center',
    backgroundColor: colors.link,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 18,
  },
  content: { gap: 10, paddingHorizontal: 4, paddingVertical: 2 },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: 'transparent',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 7,
    minHeight: 88,
    paddingHorizontal: 9,
    paddingVertical: 9,
    width: 82,
  },
  name: { color: colors.text, fontFamily: fonts.medium, fontSize: 12, maxWidth: 66 },
  selectedItem: { borderColor: colors.link, backgroundColor: colors.peachSoft },
})
