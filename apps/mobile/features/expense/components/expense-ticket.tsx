import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, Text, type StyleProp, View, type ViewStyle } from 'react-native'
import Svg, { Line } from 'react-native-svg'

import { AuthenticatedImage } from '@/features/api/authenticated-image'
import { Receipt } from './receipt'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'

type Props = {
  amount?: string
  backdropColor?: string
  compact?: boolean
  mediaAssetId?: string
  mediaToken?: string
  imageUri?: string
  meta?: string
  onPress?: () => void
  overlay?: boolean
  store?: string
  style?: StyleProp<ViewStyle>
  variant?: 'sage' | 'peach'
}
export function ExpenseTicket({
  amount = '58.000₫',
  backdropColor,
  compact = false,
  mediaAssetId,
  mediaToken,
  imageUri,
  meta = '08:42 · Cà phê',
  onPress,
  overlay = false,
  store = 'Highlands Coffee',
  style,
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
      style={[styles.card, compact && styles.compactCard, style]}
    >
      {imageUri ? (
        <Image
          accessibilityLabel="Ảnh khoản chi vừa lưu"
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={styles.photo}
        />
      ) : mediaAssetId && mediaToken ? (
        <AuthenticatedImage
          accessibilityLabel="Ảnh khoản chi"
          fallback={<PhotoFallback compact={compact} gradient={gradient} />}
          mediaAssetId={mediaAssetId}
          token={mediaToken}
          resizeMode="cover"
          style={styles.photo}
        />
      ) : (
        <PhotoFallback compact={compact} gradient={gradient} />
      )}
      {overlay ? (
        <LinearGradient
          colors={['transparent', 'rgba(31,27,24,0.88)']}
          pointerEvents="none"
          style={styles.photoOverlay}
        >
          <View style={styles.overlayInfo}>
            <Text numberOfLines={2} style={styles.overlayStore}>
              {store}
            </Text>
            <Text style={styles.overlayMeta}>{meta}</Text>
          </View>
          <Text style={styles.overlayAmount}>{amount}</Text>
        </LinearGradient>
      ) : (
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
            <Text numberOfLines={1} style={styles.store}>
              {store}
            </Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
          <Text style={styles.amount}>{amount}</Text>
        </View>
      )}
    </AnimatedPressable>
  )
}

function PhotoFallback({
  compact,
  gradient,
}: {
  compact: boolean
  gradient: readonly [string, string]
}) {
  return (
    <LinearGradient colors={gradient} end={{ x: 1, y: 1 }} style={styles.photo}>
      <Receipt
        height={compact ? 150 : 116}
        width={compact ? 104 : 84}
        rotation={compact ? '0deg' : '-4deg'}
      />
    </LinearGradient>
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
  compactTicket: { height: 64, paddingHorizontal: 16 },
  info: { gap: 2, flex: 1, paddingRight: 12, minWidth: 0 },
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
  overlayAmount: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  overlayInfo: { flex: 1, gap: 2, minWidth: 0, paddingRight: 8 },
  overlayMeta: { color: 'rgba(255,255,255,0.78)', fontFamily: fonts.medium, fontSize: 12 },
  overlayStore: { color: 'white', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19 },
  photo: {
    alignItems: 'center',
    aspectRatio: expensePhotoAspectRatio,
    width: '100%',
    justifyContent: 'center',
  },
  photoOverlay: {
    alignItems: 'flex-end',
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    left: 0,
    paddingBottom: 16,
    paddingHorizontal: 14,
    paddingTop: 72,
    position: 'absolute',
    right: 0,
  },
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
