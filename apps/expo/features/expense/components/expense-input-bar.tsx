import { Feather } from '@expo/vector-icons'
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors } from '@/features/ui/theme'

import { type FieldSuggestion, SuggestionChip, SuggestionPending } from './suggestion-chip'

export type InputBarSuggestion = FieldSuggestion & { key: string }

/** Sits on the keyboard: suggestions for the field being typed, and the way to hide the keyboard. */
export function ExpenseInputBar({
  disabled,
  field,
  pending,
  suggestions,
}: {
  disabled?: boolean
  /** Name of the field being typed, for screen readers. */
  field: string
  pending?: boolean
  suggestions: InputBarSuggestion[]
}) {
  return (
    <View style={styles.bar}>
      <ScrollView
        contentContainerStyle={styles.suggestions}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
      >
        {suggestions.map(({ key, ...suggestion }) => (
          <SuggestionChip disabled={disabled} field={field} key={key} suggestion={suggestion} />
        ))}
        {pending ? <SuggestionPending /> : null}
      </ScrollView>
      <AnimatedPressable
        accessibilityLabel="Ẩn bàn phím"
        accessibilityRole="button"
        onPress={Keyboard.dismiss}
        style={styles.dismiss}
      >
        <Feather color={colors.text} name="chevron-down" size={20} />
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    gap: 8,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dismiss: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  scroller: { flex: 1 },
  suggestions: { alignItems: 'center', flexGrow: 1, gap: 8 },
})
