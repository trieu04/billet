/* oxlint-disable react/only-export-components */
import {
  AccessibilityInfo,
  Animated,
  Platform,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Pressable } from 'react-native'
import { useEffect, useState } from 'react'

const MotionPressable = Animated.createAnimatedComponent(Pressable)
const useNativeDriver = Platform.OS !== 'web'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => subscription.remove()
  }, [])

  return reduced
}

type AnimatedPressableProps = Omit<PressableProps, 'style'> & {
  pressedScale?: number
  style?: StyleProp<ViewStyle>
}

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.97,
  style,
  ...props
}: AnimatedPressableProps) {
  const [scale] = useState(() => new Animated.Value(1))
  const reducedMotion = useReducedMotion()

  const animate = (toValue: number) => {
    if (reducedMotion) {
      scale.setValue(toValue)
      return
    }
    Animated.spring(scale, {
      toValue,
      damping: 18,
      stiffness: 340,
      mass: 0.45,
      useNativeDriver,
    }).start()
  }

  return (
    <MotionPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        animate(pressedScale)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        animate(1)
        onPressOut?.(event)
      }}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.55 }]}
    >
      {children}
    </MotionPressable>
  )
}

export function useEntranceAnimation(delay = 0, distance = 10) {
  const reducedMotion = useReducedMotion()
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1)
      return
    }
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      delay,
      useNativeDriver,
    }).start()
  }, [delay, progress, reducedMotion])

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  } as const
}
