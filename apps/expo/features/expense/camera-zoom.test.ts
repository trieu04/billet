import { describe, expect, it } from 'vitest'
import {
  factorFromZoom,
  formatZoomFactor,
  nextZoomPreset,
  pinchZoom,
  touchDistance,
  zoomFromFactor,
} from './camera-zoom'

describe('camera zoom', () => {
  it('maps factors to the 0..1 camera range and back', () => {
    expect(zoomFromFactor(1)).toBe(0)
    expect(zoomFromFactor(3)).toBe(0.5)
    expect(zoomFromFactor(5)).toBe(1)
    expect(zoomFromFactor(9)).toBe(1)
    expect(factorFromZoom(0.5)).toBe(3)
    expect(factorFromZoom(-1)).toBe(1)
  })

  it('measures the distance between two touches', () => {
    expect(touchDistance({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 })).toBe(5)
  })

  it('scales zoom by the pinch ratio and clamps it', () => {
    expect(pinchZoom(0, 100, 200)).toBe(zoomFromFactor(2))
    expect(pinchZoom(zoomFromFactor(2), 100, 50)).toBe(0)
    expect(pinchZoom(zoomFromFactor(4), 100, 400)).toBe(1)
    expect(pinchZoom(0.3, 0, 120)).toBe(0.3)
  })

  it('formats the zoom level', () => {
    expect(formatZoomFactor(0)).toBe('1×')
    expect(formatZoomFactor(zoomFromFactor(2.46))).toBe('2.5×')
    expect(formatZoomFactor(1)).toBe('5×')
  })

  it('cycles through the presets', () => {
    expect(nextZoomPreset(0)).toBe(zoomFromFactor(2))
    expect(nextZoomPreset(zoomFromFactor(2))).toBe(zoomFromFactor(5))
    expect(nextZoomPreset(zoomFromFactor(5))).toBe(0)
    expect(nextZoomPreset(zoomFromFactor(3))).toBe(zoomFromFactor(5))
  })
})
