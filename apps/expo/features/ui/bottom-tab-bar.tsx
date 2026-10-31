import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { type Href, router } from 'expo-router'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useReducedMotion } from '@/features/ui/motion'
import { type TabKey, tabRoutes } from '@/features/ui/tab-routes'
import { colors, fonts } from '@/features/ui/theme'

type TabIcon = keyof typeof Ionicons.glyphMap

const tabs: Array<{
  icon: TabIcon
  selectedIcon: TabIcon
  key: TabKey
  label: string
}> = [
  {
    icon: 'grid-outline',
    selectedIcon: 'grid',
    key: 'grid',
    label: 'Bảng',
  },
  {
    icon: 'albums-outline',
    selectedIcon: 'albums',
    key: 'journal',
    label: 'Nhật ký',
  },
  {
    icon: 'stats-chart-outline',
    selectedIcon: 'stats-chart',
    key: 'statistics',
    label: 'Thống kê',
  },
]

const barHeight = 64
const barPadding = 4
const useNativeDriver = Platform.OS !== 'web'
const liquidGlass = isLiquidGlassAvailable()

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function BottomTabBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets()
  const reducedMotion = useReducedMotion()
  const activeIndex = tabs.findIndex((tab) => tab.key === active)
  const [focusedIndex, setFocusedIndex] = useState(activeIndex)
  const [tabWidth, setTabWidth] = useState(0)
  const barRef = useRef<ViewInstance>(null)
  const barX = useRef(0)
  const dragging = useRef(false)
  const [indicatorX] = useState(() => new Animated.Value(0))
  const [lift] = useState(() => new Animated.Value(0))

  // PanResponder handlers are created once, so they read layout and selection from a ref.
  const latest = useRef({ activeIndex, reducedMotion, tabWidth })
  useLayoutEffect(() => {
    latest.current = { activeIndex, reducedMotion, tabWidth }
  }, [activeIndex, reducedMotion, tabWidth])

  useEffect(() => {
    if (!tabWidth || dragging.current) return
    setFocusedIndex(activeIndex)
    if (reducedMotion) {
      indicatorX.setValue(activeIndex * tabWidth)
      return
    }
    Animated.timing(indicatorX, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: activeIndex * tabWidth,
      useNativeDriver,
    }).start()
  }, [activeIndex, indicatorX, reducedMotion, tabWidth])

  const panResponder = useMemo(() => {
    const select = (index: number) => {
      const { activeIndex, reducedMotion, tabWidth } = latest.current
      setFocusedIndex(index)
      Animated.spring(lift, { toValue: 0, damping: 18, stiffness: 260, useNativeDriver }).start()
      if (reducedMotion || !tabWidth) indicatorX.setValue(index * tabWidth)
      else
        Animated.timing(indicatorX, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: index * tabWidth,
          useNativeDriver,
        }).start()
      if (index === activeIndex) return
      router.navigate(tabRoutes[index].route as Href)
    }
    const indexAt = (pageX: number) => {
      const { activeIndex, tabWidth } = latest.current
      if (!tabWidth) return activeIndex
      return clamp(Math.floor((pageX - barX.current - barPadding) / tabWidth), 0, tabs.length - 1)
    }
    const follow = (pageX: number) => {
      const { tabWidth } = latest.current
      const x = pageX - barX.current - barPadding - tabWidth / 2
      indicatorX.setValue(clamp(x, 0, tabWidth * (tabs.length - 1)))
      setFocusedIndex(indexAt(pageX))
    }
    return {
      select,
      // Handlers read refs only while a gesture is active, never during render.
      // oxlint-disable-next-line react/refs
      handlers: PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: (event) => {
          dragging.current = true
          Animated.spring(lift, {
            toValue: 1,
            damping: 16,
            stiffness: 300,
            useNativeDriver,
          }).start()
          follow(event.nativeEvent.pageX)
        },
        onPanResponderMove: (event) => follow(event.nativeEvent.pageX),
        onPanResponderRelease: (event) => {
          dragging.current = false
          select(indexAt(event.nativeEvent.pageX))
        },
        onPanResponderTerminate: () => {
          dragging.current = false
          select(latest.current.activeIndex)
        },
        onPanResponderTerminationRequest: () => false,
      }).panHandlers,
    }
  }, [indicatorX, lift])

  const onLayout = (event: LayoutChangeEvent) => {
    setTabWidth((event.nativeEvent.layout.width - barPadding * 2) / tabs.length)
    barRef.current?.measureInWindow((x) => {
      barX.current = x
    })
  }

  return (
    <View
      {...panResponder.handlers}
      accessibilityRole="tablist"
      onLayout={onLayout}
      ref={barRef}
      style={[styles.bar, { bottom: Math.max(insets.bottom - 8, 14) }]}
    >
      <TabBarBackground />
      {tabWidth ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              transform: [
                { translateX: indicatorX },
                { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
              width: tabWidth,
            },
          ]}
        />
      ) : null}
      {tabs.map((tab, index) => {
        const highlighted = focusedIndex === index
        const tint = highlighted ? colors.linkStrong : colors.tabInactive
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === tab.key }}
            key={tab.key}
            onPress={() => panResponder.select(index)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons color={tint} name={highlighted ? tab.selectedIcon : tab.icon} size={23} />
            <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function TabBarBackground() {
  return (
    <>
      {liquidGlass ? (
        <GlassView colorScheme="light" glassEffectStyle="regular" style={styles.background} />
      ) : Platform.OS !== 'android' ? (
        <BlurView intensity={90} style={styles.background} tint="systemChromeMaterialLight" />
      ) : null}
      {/* Native Liquid Glass adapts to what is behind it; other platforms get a light scrim. */}
      {liquidGlass ? null : <View pointerEvents="none" style={[styles.background, styles.scrim]} />}
    </>
  )
}

const styles = StyleSheet.create({
  background: {
    borderRadius: barHeight / 2,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bar: {
    borderColor: 'rgba(42, 37, 34, 0.06)',
    borderRadius: barHeight / 2,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: barHeight,
    left: 20,
    padding: barPadding,
    position: 'absolute',
    right: 20,
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  indicator: {
    backgroundColor: 'rgba(244, 184, 156, 0.78)',
    borderRadius: (barHeight - barPadding * 2) / 2,
    bottom: barPadding,
    left: barPadding,
    position: 'absolute',
    top: barPadding,
  },
  label: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.1 },
  pressed: { opacity: 0.7 },
  scrim: { backgroundColor: 'rgba(255, 253, 249, 0.7)' },
  tab: { alignItems: 'center', flex: 1, gap: 2, justifyContent: 'center' },
})
