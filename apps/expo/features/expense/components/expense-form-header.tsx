import { Feather } from '@expo/vector-icons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

/** Header of the expense forms: close on the left, the save action always within reach. */
export function ExpenseFormHeader({
  closeLabel,
  onClose,
  onSave,
  saveLabel,
  saving,
  savingLabel,
}: {
  closeLabel: string
  onClose(): void
  onSave(): void
  saveLabel: string
  saving: boolean
  /** Shown as the title while saving. */
  savingLabel: string
}) {
  return (
    <View style={styles.header}>
      <AnimatedPressable
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
        disabled={saving}
        onPress={onClose}
        style={styles.close}
      >
        <Feather color={colors.text} name="x" size={22} />
      </AnimatedPressable>
      <Text numberOfLines={1} style={styles.title}>
        {saving ? savingLabel : ''}
      </Text>
      <AnimatedPressable
        accessibilityLabel={saving ? savingLabel : saveLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: saving, disabled: saving }}
        disabled={saving}
        onPress={onSave}
        style={styles.save}
      >
        {saving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.saveText}>{saveLabel}</Text>
        )}
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  close: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 16,
  },
  saveText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
})
