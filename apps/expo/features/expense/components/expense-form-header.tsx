import { Feather } from '@expo/vector-icons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BlurSurface } from '@/features/ui/blur-header'
import { headerRowHeight } from '@/features/ui/header-metrics'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

/** Frosted header of the expense forms, pinned over the scroll content. Close on the left, save on the right. */
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
  const insets = useSafeAreaInsets()

  return (
    <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top }]}>
      <BlurSurface />
      <View style={styles.row}>
        <AnimatedPressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          disabled={saving}
          hitSlop={2}
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
          hitSlop={2}
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
    </View>
  )
}

const styles = StyleSheet.create({
  close: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  header: { left: 0, position: 'absolute', right: 0, top: 0, zIndex: 1 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: headerRowHeight,
    paddingHorizontal: 16,
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 16,
  },
  saveText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 17,
    textAlign: 'center',
  },
})
