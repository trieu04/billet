import { LinearGradient } from 'expo-linear-gradient'
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { Receipt } from './receipt'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

type Props = {
  amount?: string
  backdropColor?: string
  compact?: boolean
  imageSource?: ImageSourcePropType
  meta?: string
  onPress?: () => void
  store?: string
  variant?: 'sage' | 'peach'
}
export function ExpenseTicket({
  amount = '58.000₫',
  backdropColor,
  compact = false,
  imageSource,
  meta = '08:42 · Cà phê',
  onPress,
  store = 'Highlands Coffee',
  variant = 'sage',
}: Props) {
  const gradient =
    variant === 'sage'
      ? ([colors.sage, colors.butter] as const)
      : ([colors.peachSoft, colors.lavender] as const)
  const resolvedBackdropColor = backdropColor ?? (compact ? colors.camera : colors.canvas)
  return (
    <AnimatedPressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.card, compact && styles.compactCard]}
    >
      {imageSource ? (
        <Image
          accessibilityLabel="Ảnh khoản chi"
          resizeMode="cover"
          source={imageSource}
          style={[styles.photo, compact && styles.compactPhoto]}
        />
      ) : (
        <LinearGradient
          colors={gradient}
          end={{ x: 1, y: 1 }}
          style={[styles.photo, compact && styles.compactPhoto]}
        >
          <Receipt
            height={compact ? 150 : 116}
            width={compact ? 104 : 84}
            rotation={compact ? '0deg' : '-4deg'}
          />
        </LinearGradient>
      )}
      <View style={[styles.ticket, compact && styles.compactTicket]}>
        <View pointerEvents="none" style={styles.perforation}>
          <Svg height={2} preserveAspectRatio="none" viewBox="0 0 358 2" width="100%">
            <Line
              stroke={colors.line}
              strokeDasharray="5 4"
              strokeWidth={2}
              x1={0}
              x2={358}
              y1={1}
              y2={1}
            />
          </Svg>
        </View>
        <View style={[styles.notchLeft, { backgroundColor: resolvedBackdropColor }]} />
        <View style={[styles.notchRight, { backgroundColor: resolvedBackdropColor }]} />
        <View style={styles.info}>
          <Text style={styles.store}>{store}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </AnimatedPressable>
  )
}
const styles = StyleSheet.create({
  amount: { color: colors.text, fontFamily: fonts.amount, fontSize: 22 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    width: '100%',
  },
  compactCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.4,
    shadowRadius: 44,
  },
  compactPhoto: { height: 200 },
  compactTicket: { height: 64, paddingHorizontal: 16 },
  info: { gap: 2 },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  notchLeft: {
    borderRadius: 10,
    height: 20,
    left: -10,
    position: 'absolute',
    top: -10,
    width: 20,
  },
  notchRight: {
    borderRadius: 10,
    height: 20,
    position: 'absolute',
    right: -10,
    top: -10,
    width: 20,
  },
  photo: { alignItems: 'center', height: 150, justifyContent: 'center' },
  perforation: { height: 2, left: 0, position: 'absolute', right: 0, top: -1 },
  store: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  ticket: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 67,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
})
