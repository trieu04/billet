import { BlurView } from 'expo-blur'
import type { ReactNode } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { headerFadeHeight, headerRowHeight } from '@/features/ui/header-metrics'

const hasBlur = Platform.OS === 'ios'
const material = 'systemUltraThinMaterialLight'
const tintStrength = 0.54
const bodyIntensity = 72

/** Frosted-glass bar material with a crisp bottom edge. */
export function BlurSurface() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {hasBlur ? (
        <BlurView intensity={bodyIntensity} style={StyleSheet.absoluteFill} tint={material} />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(245, 240, 232, ${tintStrength})` },
        ]}
      />
    </View>
  )
}

/** Header pinned over a pushed screen; content scrolls underneath it. */
export function StackHeader({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top }]}>
      <BlurSurface />
      <View style={styles.row}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    left: 0,
    paddingBottom: headerFadeHeight,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: headerRowHeight,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
})
