import { Feather } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

export type SuggestionRow = {
  key: string
  label: string
  value?: string
  /** Where the machine value came from, for example “Từ hóa đơn”. */
  source: string | null
  editor?: ReactNode
  action?: { label: string; onPress(): void }
}

export type SuggestionChipItem = {
  key: string
  /** Field name, for example “Số tiền”. */
  field: string
  value: string
  source: string | null
  onPress(): void
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

/** Details filled from the photo plus tap-to-apply suggestions. */
export function SuggestionPanel({
  chips,
  disabled,
  pending,
  rows,
}: {
  chips: SuggestionChipItem[]
  disabled?: boolean
  pending: boolean
  rows: SuggestionRow[]
}) {
  if (!pending && rows.length === 0 && chips.length === 0) return null
  return (
    <View style={styles.card}>
      {pending ? (
        <View accessibilityLiveRegion="polite" style={styles.status}>
          <ActivityIndicator color={colors.link} size="small" />
          <Text style={styles.statusText}>Đang tìm gợi ý từ ảnh…</Text>
        </View>
      ) : null}
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.label}>{row.label}</Text>
            {row.source ? <SourceBadge label={row.source} /> : null}
          </View>
          {row.editor ?? (row.value ? <Text style={styles.value}>{row.value}</Text> : null)}
          {row.action ? (
            <AnimatedPressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={row.action.onPress}
              style={styles.action}
            >
              <Text style={styles.actionText}>{row.action.label}</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      ))}
      {chips.length > 0 ? (
        <View style={styles.chips}>
          <Text style={styles.label}>GỢI Ý</Text>
          <View style={styles.chipList}>
            {chips.map((chip) => (
              <AnimatedPressable
                accessibilityHint="Chạm để điền giá trị này"
                accessibilityLabel={`Áp dụng gợi ý ${chip.field}: ${chip.value}${
                  chip.source ? `, ${chip.source}` : ''
                }`}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                key={chip.key}
                onPress={chip.onPress}
                style={styles.chip}
              >
                <Feather color={colors.link} name="plus" size={14} />
                <View style={styles.chipBody}>
                  <Text numberOfLines={1} style={styles.chipValue}>
                    {chip.field}: {chip.value}
                  </Text>
                  {chip.source ? (
                    <Text numberOfLines={1} style={styles.chipSource}>
                      {chip.source}
                    </Text>
                  ) : null}
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  action: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 13 },
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
  card: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 20,
    gap: 12,
    padding: 16,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipBody: { flexShrink: 1 },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSource: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11 },
  chipValue: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  chips: { gap: 8 },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
  },
  row: { gap: 6 },
  rowHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 24 },
  statusText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  value: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
})
