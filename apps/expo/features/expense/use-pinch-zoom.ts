import { useState } from 'react'
import { PanResponder } from 'react-native'
import { pinchZoom, touchDistance } from './camera-zoom'

class PinchTracker {
  zoom = 0
  private startDistance = 0
  private startZoom = 0

  constructor(private readonly onChange: (zoom: number) => void) {}

  set(zoom: number) {
    this.zoom = zoom
    this.onChange(zoom)
  }

  begin() {
    this.startDistance = 0
    this.startZoom = this.zoom
  }

  move(distance: number) {
    if (this.startDistance <= 0) {
      this.startDistance = distance
      this.startZoom = this.zoom
      return
    }
    this.set(pinchZoom(this.startZoom, this.startDistance, distance))
  }
}

// Two-finger pinch over a view, producing the 0..1 zoom value expo-camera expects.
export function usePinchZoom() {
  const [zoom, setZoomState] = useState(0)
  const [tracker] = useState(() => new PinchTracker(setZoomState))
  const [responder] = useState(() => {
    const isPinch = (touches: readonly unknown[]) => touches.length >= 2
    return PanResponder.create({
      onMoveShouldSetPanResponder: (event) => isPinch(event.nativeEvent.touches),
      onMoveShouldSetPanResponderCapture: (event) => isPinch(event.nativeEvent.touches),
      onPanResponderGrant: () => tracker.begin(),
      onPanResponderMove: (event) => {
        const [a, b] = event.nativeEvent.touches
        if (a && b) tracker.move(touchDistance(a, b))
      },
      onPanResponderTerminationRequest: () => false,
    })
  })

  return {
    zoom,
    setZoom: (value: number) => tracker.set(value),
    panHandlers: responder.panHandlers,
  }
}
