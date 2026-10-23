/* oxlint-disable react/only-export-components */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AccessibilityInfo, Animated, Image, Platform, StyleSheet } from 'react-native'

import { useReducedMotion } from '@/features/ui/motion'
import type { Expense } from '@/features/api/types'
import {
  type PhotoBounds,
  reconcileSavedCaptures,
  removeSavedCapture,
  type SavedCapture,
} from './capture-model'

type CaptureTransition = SavedCapture & { source: PhotoBounds }
type CaptureFlow = {
  captures: SavedCapture[]
  insertingId: string | null
  saveCapture: (capture: SavedCapture, source?: PhotoBounds) => void
  insertPhoto: (id: string, destination: PhotoBounds) => void
  reconcileCaptures: (expenses: Expense[]) => void
  removeCapture: (id: string) => void
}

const CaptureContext = createContext<CaptureFlow | null>(null)

export function CaptureFlowProvider({ children }: PropsWithChildren) {
  const [captures, setCaptures] = useState<SavedCapture[]>([])
  const [transition, setTransition] = useState<CaptureTransition | null>(null)
  const moving = useRef(false)
  const [progress] = useState(() => new Animated.Value(0))
  const [destination, setDestination] = useState<PhotoBounds | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!transition) return
    const timeout = setTimeout(() => setTransition(null), 1800)
    return () => clearTimeout(timeout)
  }, [transition])

  const reconcileCaptures = useCallback((expenses: Expense[]) => {
    setCaptures((current) => reconcileSavedCaptures(current, expenses))
  }, [])

  const removeCapture = useCallback((id: string) => {
    setCaptures((current) => removeSavedCapture(current, id))
    setTransition((current) => (current?.expense.id === id ? null : current))
  }, [])

  const saveCapture = useCallback(
    (capture: SavedCapture, source?: PhotoBounds) => {
      setCaptures((current) => [
        capture,
        ...current.filter((item) => item.expense.id !== capture.expense.id),
      ])
      progress.setValue(0)
      moving.current = false
      setDestination(null)
      setTransition(capture.imageUri && source ? { ...capture, source } : null)
      AccessibilityInfo.announceForAccessibility('Đã lưu chi tiêu vào dòng thời gian')
    },
    [progress],
  )

  const insertPhoto = useCallback(
    (id: string, target: PhotoBounds) => {
      if (!transition || transition.expense.id !== id || moving.current) return
      moving.current = true
      setDestination(target)
      const animation = reducedMotion
        ? Animated.timing(progress, {
            toValue: 1,
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          })
        : Animated.spring(progress, {
            toValue: 1,
            damping: 26,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: Platform.OS !== 'web',
          })
      animation.start(() => {
        setTransition(null)
        setDestination(null)
        moving.current = false
      })
    },
    [progress, reducedMotion, transition],
  )

  const value = useMemo(
    () => ({
      captures,
      insertingId: transition?.expense.id ?? null,
      saveCapture,
      insertPhoto,
      reconcileCaptures,
      removeCapture,
    }),
    [captures, insertPhoto, reconcileCaptures, removeCapture, saveCapture, transition],
  )
  const source = transition?.source
  return (
    <CaptureContext.Provider value={value}>
      {children}
      {transition?.imageUri && source ? (
        <Animated.View
          testID="capture-photo-transition"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.photo,
            { left: source.x, top: source.y, width: source.width, height: source.height },
            reducedMotion
              ? { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
              : {
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          0,
                          destination
                            ? destination.x - source.x + (destination.width - source.width) / 2
                            : 0,
                        ],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          0,
                          destination
                            ? destination.y - source.y + (destination.height - source.height) / 2
                            : 0,
                        ],
                      }),
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, destination ? destination.width / source.width : 1],
                      }),
                    },
                  ],
                },
          ]}
        >
          <Image source={{ uri: transition.imageUri }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </CaptureContext.Provider>
  )
}

export function useCaptureFlow() {
  const context = useContext(CaptureContext)
  if (!context) throw new Error('useCaptureFlow requires CaptureFlowProvider')
  return context
}

const styles = StyleSheet.create({
  photo: {
    position: 'absolute',
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    zIndex: 100,
  },
})
