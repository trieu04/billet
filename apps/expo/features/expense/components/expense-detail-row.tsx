import { Feather } from '@expo/vector-icons'
import type { ComponentProps, ReactNode, Ref } from 'react'
import { Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { type FieldSuggestion, SourceBadge, SuggestionChip } from './suggestion-chip'

/**
 * One detail of the expense. The whole row is the touch target for its input, and any suggestion
 * for the field sits right under it.
 */
export function ExpenseDetailRow({
  action,
  children,
  disabled,
  icon,
  label,
  onPress,
  ref,
  source,
  suggestion,
  trailing,
}: {
  action?: { label: string; onPress(): void }
  /** The field's input. */
  children: ReactNode
  disabled?: boolean
  icon: ComponentProps<typeof Feather>['name']
  label: string
  /** Focuses the row's input. */
  onPress(): void
  ref?: Ref<ViewInstance>
  source?: string | null
  suggestion?: FieldSuggestion | null
  trailing?: ReactNode
}) {
  return (
    <View ref={ref} collapsable={false} style={styles.row}>
      <Pressable accessible={false} disabled={disabled} onPress={onPress} style={styles.main}>
        <View style={styles.icon}>
          <Feather color={colors.link} name={icon} size={18} />
        </View>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.label}>{label}</Text>
            {source ? <SourceBadge label={source} /> : null}
          </View>
          {children}
        </View>
        {trailing}
      </Pressable>
      {suggestion ? (
        <View style={styles.extra}>
          <SuggestionChip disabled={disabled} field={label} suggestion={suggestion} />
        </View>
      ) : null}
      {action ? (
        <View style={styles.extra}>
          <AnimatedPressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={action.onPress}
            style={styles.action}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </AnimatedPressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  action: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  actionText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 13 },
  body: { flex: 1, gap: 2, minWidth: 0 },
  extra: { paddingBottom: 8, paddingLeft: 58, paddingRight: 12 },
  header: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  label: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12 },
  main: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
})
