import { useCallback, useMemo, useRef } from 'react'
import type { ScrollViewInstance, ScrollViewProps, ViewInstance } from 'react-native'

import { nextScrollOffset } from './capture-model'

/** Keeps the block around the focused input inside the part of a ScrollView the keyboard leaves. */
export function useKeepFocusedVisible() {
  const scrollRef = useRef<ScrollViewInstance>(null)
  const contentRef = useRef<ViewInstance>(null)
  const target = useRef<ViewInstance | null>(null)
  const offset = useRef(0)
  const viewport = useRef(0)

  const reveal = useCallback(() => {
    const block = target.current
    const content = contentRef.current
    if (!block || !content || viewport.current === 0) return
    block.measureLayout(content, (_x, y, _width, height) => {
      const next = nextScrollOffset({
        top: y,
        bottom: y + height,
        viewport: viewport.current,
        offset: offset.current,
      })
      if (next !== null) scrollRef.current?.scrollTo({ y: next, animated: true })
    })
  }, [])

  const scrollProps = useMemo<ScrollViewProps>(
    () => ({
      onLayout: ({ nativeEvent }) => {
        viewport.current = nativeEvent.layout.height
        reveal()
      },
      onScroll: ({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y
      },
      scrollEventThrottle: 32,
    }),
    [reveal],
  )

  const focused = useCallback(
    (block: ViewInstance | null) => {
      target.current = block
      reveal()
    },
    [reveal],
  )
  const blurred = useCallback((block: ViewInstance | null) => {
    if (target.current === block) target.current = null
  }, [])

  return { blurred, contentRef, focused, scrollProps, scrollRef }
}
