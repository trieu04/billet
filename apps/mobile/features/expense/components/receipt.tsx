import { StyleSheet, View } from 'react-native'
import { colors } from '@/features/ui/theme'

export function Receipt({
  height,
  width,
  rotation = '-4deg',
}: {
  height: number
  width: number
  rotation?: string
}) {
  return (
    <View
      accessibilityLabel="Hóa đơn đã chụp"
      style={[styles.receipt, { height, width, transform: [{ rotate: rotation }] }]}
    >
      {Array.from({ length: Math.floor((height - 12) / 14) }, (_, index) => (
        <View key={index} style={styles.line} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  receipt: {
    backgroundColor: colors.card,
    borderRadius: 6,
    gap: 10,
    paddingTop: 10,
    shadowColor: '#3C2814',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  line: { backgroundColor: colors.line, height: 4, width: '100%' },
})
