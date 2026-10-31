// expo-camera takes zoom as a 0..1 fraction of the device maximum. The UI shows a
// friendlier 1×–5× factor mapped linearly onto that range.
export const minZoomFactor = 1
export const maxZoomFactor = 5
export const zoomPresets = [1, 2, 5] as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function zoomFromFactor(factor: number) {
  return clamp((factor - minZoomFactor) / (maxZoomFactor - minZoomFactor), 0, 1)
}

export function factorFromZoom(zoom: number) {
  return minZoomFactor + clamp(zoom, 0, 1) * (maxZoomFactor - minZoomFactor)
}

export function touchDistance(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
}

export function pinchZoom(startZoom: number, startDistance: number, currentDistance: number) {
  if (startDistance <= 0) return clamp(startZoom, 0, 1)
  return zoomFromFactor((factorFromZoom(startZoom) * currentDistance) / startDistance)
}

export function formatZoomFactor(zoom: number) {
  const factor = Math.round(factorFromZoom(zoom) * 10) / 10
  return `${Number.isInteger(factor) ? factor : factor.toFixed(1)}×`
}

export function nextZoomPreset(zoom: number) {
  const factor = factorFromZoom(zoom)
  const next = zoomPresets.find((preset) => preset > factor + 0.05) ?? zoomPresets[0]
  return zoomFromFactor(next)
}
