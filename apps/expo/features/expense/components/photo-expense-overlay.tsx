import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { fonts } from '@/features/ui/theme'

type Props = {
  amount: string
  amountEditor?: ReactNode
  meta: string
  onAmountPress?: () => void
  onTitlePress?: () => void
  title: string
  titleEditor?: ReactNode
}

export function PhotoExpenseOverlay({
  amount,
  amountEditor,
  meta,
  onAmountPress,
  onTitlePress,
  title,
  titleEditor,
}: Props) {
  const info = (
    <>
      <Text numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.meta}>{meta}</Text>
    </>
  )
  const amountText = <Text style={styles.amount}>{amount}</Text>

  return (
    <LinearGradient
      colors={['transparent', 'rgba(31,27,24,0.88)']}
      pointerEvents={onTitlePress || onAmountPress ? 'box-none' : 'none'}
      style={styles.overlay}
    >
      {titleEditor ? (
        <View style={styles.info}>
          {titleEditor}
          <Text style={styles.meta}>{meta}</Text>
        </View>
      ) : onTitlePress ? (
        <AnimatedPressable
          accessibilityHint="Chỉnh sửa trực tiếp tiêu đề trên ảnh"
          accessibilityLabel={title}
          accessibilityRole="button"
          onPress={onTitlePress}
          style={styles.info}
        >
          {info}
        </AnimatedPressable>
      ) : (
        <View style={styles.info}>{info}</View>
      )}
      {amountEditor ? (
        <View style={styles.amountButton}>{amountEditor}</View>
      ) : onAmountPress ? (
        <AnimatedPressable
          accessibilityHint="Chỉnh sửa trực tiếp số tiền trên ảnh"
          accessibilityLabel={`Sửa số tiền: ${amount}`}
          accessibilityRole="button"
          onPress={onAmountPress}
          style={styles.amountButton}
        >
          {amountText}
        </AnimatedPressable>
      ) : (
        <View style={styles.amountButton}>{amountText}</View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  amount: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  amountButton: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minHeight: 44,
    paddingBottom: 1,
  },
  info: {
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 44,
    minWidth: 0,
    paddingRight: 8,
  },
  meta: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  overlay: {
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
  title: {
    color: 'white',
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 19,
  },
})
