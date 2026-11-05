import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { type ReactNode, useState } from 'react'
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native'

import type { Category } from '@/features/api/types'
import { categoryIcon } from '@/features/category/category-options'
import { colors, fonts } from '@/features/ui/theme'

/** Background of the caption, amount and category on a photo, on every screen. */
export const photoFieldBackground = 'rgba(255,255,255,0.16)'

/** The gradient every expense photo uses behind its caption and amount. */
export function PhotoOverlaySurface({
  children,
  interactive = false,
  style,
}: {
  children: ReactNode
  interactive?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <LinearGradient
      colors={['transparent', 'rgba(31,27,24,0.94)']}
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[styles.surface, style]}
    >
      {children}
    </LinearGradient>
  )
}

/** The expense's category on its photo: an icon in the category color and the name. */
export function PhotoCategoryTag({ category, large }: { category: Category; large?: boolean }) {
  return (
    <>
      <View
        style={[
          styles.categoryIcon,
          large && styles.categoryIconLarge,
          { backgroundColor: category.color },
        ]}
      >
        <Feather color={colors.text} name={categoryIcon(category.icon)} size={large ? 14 : 12} />
      </View>
      <Text numberOfLines={1} style={[styles.categoryName, large && styles.categoryNameLarge]}>
        {category.name}
      </Text>
    </>
  )
}

export function PhotoExpenseOverlay({
  amount,
  category,
  title,
}: {
  amount: string
  category?: Category
  title: string
}) {
  const [titleMultiline, setTitleMultiline] = useState(false)
  return (
    <PhotoOverlaySurface style={styles.content}>
      <View style={[styles.field, styles.titleField, titleMultiline && styles.titleMultiline]}>
        <Text
          numberOfLines={2}
          onTextLayout={({ nativeEvent }) => setTitleMultiline(nativeEvent.lines.length > 1)}
          style={styles.title}
        >
          {title}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <View style={[styles.field, styles.amountField]}>
          <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.amount}>
            {amount}
          </Text>
        </View>
        {category ? (
          <View
            accessible
            accessibilityLabel={`Danh mục: ${category.name}`}
            style={[styles.field, styles.categoryTag]}
          >
            <PhotoCategoryTag category={category} />
          </View>
        ) : null}
      </View>
    </PhotoOverlaySurface>
  )
}

const styles = StyleSheet.create({
  amount: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  amountField: { flexShrink: 1, paddingHorizontal: 12 },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  categoryIconLarge: { borderRadius: 13, height: 26, width: 26 },
  categoryName: { color: 'white', flexShrink: 1, fontFamily: fonts.medium, fontSize: 12 },
  categoryNameLarge: { fontSize: 14 },
  categoryTag: {
    alignItems: 'center',
    flexDirection: 'row',
    // A long amount takes the room from the name first, down to just the icon.
    flexShrink: 100,
    gap: 5,
    minWidth: 35,
    overflow: 'hidden',
    paddingLeft: 5,
    paddingRight: 10,
  },
  content: { gap: 6 },
  field: {
    backgroundColor: photoFieldBackground,
    borderCurve: 'continuous',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 32,
  },
  surface: {
    bottom: 0,
    left: 0,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 72,
    position: 'absolute',
    right: 0,
  },
  titleField: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  titleMultiline: { borderRadius: 14 },
  title: {
    color: 'white',
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 19,
  },
})
