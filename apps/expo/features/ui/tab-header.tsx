import { BlurView } from 'expo-blur'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BlurSurface } from '@/features/ui/blur-header'
import { headerFadeHeight, headerRowHeight, weekdayBarHeight } from '@/features/ui/header-metrics'
import { useReducedMotion } from '@/features/ui/motion'
import { type TabKey, tabRoutes } from '@/features/ui/tab-routes'
import { colors, fonts } from '@/features/ui/theme'

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)
const useNativeDriver = Platform.OS !== 'web'
const rowInset = 16

/** Fixed header shared by the main tabs; scene content scrolls underneath it. */
export function TabHeader({ action, active }: { action: ReactNode; active: TabKey }) {
  const insets = useSafeAreaInsets()

  return (
    <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top }]}>
      <BlurSurface />
      <View style={styles.row}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {tabRoutes.map((tab) => (
            <TabTitle key={tab.key} label={tab.label} visible={tab.key === active} />
          ))}
        </View>
        {Platform.OS === 'ios' ? <TitleBlurPulse active={active} topInset={insets.top} /> : null}
        {action}
      </View>
      {active === 'grid' ? <WeekdayBar /> : null}
    </View>
  )
}

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Weekday labels aligned with the calendar boards, part of the header's own glass. */
function WeekdayBar() {
  const { width } = useWindowDimensions()

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.weekdays, { width: Math.min(width - 32, 430) }]}
    >
      {weekdays.map((day) => (
        <Text key={day} maxFontSizeMultiplier={1.2} style={styles.weekday}>
          {day}
        </Text>
      ))}
    </View>
  )
}

function TabTitle({ label, visible }: { label: string; visible: boolean }) {
  const reducedMotion = useReducedMotion()
  const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0))

  useEffect(() => {
    const toValue = visible ? 1 : 0
    if (reducedMotion) {
      opacity.setValue(toValue)
      return
    }
    const fade = Animated.timing(opacity, {
      duration: 280,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      toValue,
      useNativeDriver,
    })
    fade.start()
    return () => fade.stop()
  }, [opacity, reducedMotion, visible])

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[styles.title, { opacity }]}
    >
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={styles.titleText}
      >
        {label}
      </Text>
    </Animated.View>
  )
}

/** Briefly blurs the titles in place while they swap, like the iOS blur-replace transition. */
function TitleBlurPulse({ active, topInset }: { active: TabKey; topInset: number }) {
  const reducedMotion = useReducedMotion()
  const [blur] = useState(() => new Animated.Value(0))
  const previous = useRef(active)

  useEffect(() => {
    if (previous.current === active) return
    previous.current = active
    if (reducedMotion) return
    const pulse = Animated.sequence([
      Animated.timing(blur, { duration: 90, toValue: 1, useNativeDriver: false }),
      Animated.timing(blur, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: false,
      }),
    ])
    pulse.start()
    return () => pulse.stop()
  }, [active, blur, reducedMotion])

  return (
    <AnimatedBlurView
      intensity={blur.interpolate({ inputRange: [0, 1], outputRange: [0, 12] })}
      pointerEvents="none"
      style={[styles.pulse, { top: -topInset }]}
      tint="light"
    />
  )
}

const styles = StyleSheet.create({
  header: {
    left: 0,
    paddingBottom: headerFadeHeight,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pulse: { bottom: 0, left: -rowInset, position: 'absolute', right: -rowInset },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: headerRowHeight,
    justifyContent: 'flex-end',
    marginHorizontal: rowInset,
  },
  title: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  weekday: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  weekdays: {
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    height: weekdayBarHeight,
    paddingHorizontal: 12,
  },
  titleText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
})
