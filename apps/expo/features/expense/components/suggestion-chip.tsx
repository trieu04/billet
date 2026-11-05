import { Feather } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

export type FieldSuggestion = {
  value: string
  /** Where the suggestion came from, for example “Từ hóa đơn”. */
  source: string | null
  onPress(): void
  /** Replaces the default plus icon, for actions such as using the current location. */
  icon?: ComponentProps<typeof Feather>['name']
  /** Shows a spinner instead of the icon and blocks taps. */
  busy?: boolean
}

/** Small label naming the source of a machine-filled value. */
export function SourceBadge({ label }: { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`Nguồn: ${label}`}
      accessibilityRole="text"
      style={styles.badge}
    >
      <Feather color={colors.link} name="zap" size={11} />
      <Text numberOfLines={1} style={styles.badgeText}>
        {label}
      </Text>
    </View>
  )
}

/** Tap-to-apply suggestion shown next to the field it would fill. */
export function SuggestionChip({
  disabled,
  field,
  suggestion,
}: {
  disabled?: boolean
  /** Field name, for example “Số tiền”. */
  field: string
  suggestion: FieldSuggestion
}) {
  const { busy, icon = 'plus', onPress, source, value } = suggestion
  return (
    <AnimatedPressable
      accessibilityHint="Chạm để điền giá trị này"
      accessibilityLabel={`Áp dụng gợi ý ${field}: ${value}${source ? `, ${source}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={styles.chip}
    >
      {busy ? (
        <ActivityIndicator color={colors.link} size="small" />
      ) : (
        <Feather color={colors.link} name={icon} size={14} />
      )}
      <Text numberOfLines={1} style={styles.chipValue}>
        {value}
      </Text>
      {source ? (
        <Text numberOfLines={1} style={styles.chipSource}>
          {source}
        </Text>
      ) : null}
    </AnimatedPressable>
  )
}

export function SuggestionPending() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.pending}>
      <ActivityIndicator color={colors.link} size="small" />
      <Text style={styles.pendingText}>Đang tìm gợi ý từ ảnh…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.peachSoft,
    borderRadius: 10,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: colors.linkStrong, flexShrink: 1, fontFamily: fonts.medium, fontSize: 12 },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.peachSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  chipSource: {
    color: colors.linkStrong,
    flexShrink: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  chipValue: { color: colors.text, flexShrink: 1, fontFamily: fonts.semibold, fontSize: 14 },
  pending: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 24 },
  pendingText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
})
