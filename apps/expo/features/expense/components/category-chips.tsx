import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { colors, fonts } from '@/features/ui/theme'

const defaultCategories = ['Cà phê', 'Ăn uống', 'Đi lại', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Khác']

export function CategoryChips({
  selected,
  onSelect,
  onAdd,
  categories = defaultCategories,
}: {
  selected?: string
  onSelect: (category: string) => void
  onAdd: () => void
  categories?: string[]
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {categories.map((category) => {
        const active = category === selected
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={category}
            onPress={() => onSelect(category)}
            style={[styles.chip, active && styles.active]}
          >
            {active ? <Feather color={colors.greenText} name="check" size={15} /> : null}
            <Text style={[styles.text, active && styles.activeText]}>{category}</Text>
          </Pressable>
        )
      })}
      <Pressable
        accessibilityLabel="Thêm danh mục"
        accessibilityRole="button"
        onPress={onAdd}
        style={[styles.chip, styles.add]}
      >
        <Feather color={colors.text} name="plus" size={18} />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  active: { backgroundColor: colors.sage },
  activeText: { color: colors.greenText, fontFamily: fonts.semibold },
  add: { paddingHorizontal: 12 },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 19,
    flexDirection: 'row',
    gap: 5,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  content: { gap: 8, paddingHorizontal: 20 },
  scroll: { flexGrow: 0 },
  text: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
})
