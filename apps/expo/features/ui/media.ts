// Keep uploaded media intact. Large expense moments use a portrait 3:4
// viewport; dense calendar thumbnails use a square cover crop.
export const expensePhotoAspectRatio = 3 / 4
export const expenseThumbnailAspectRatio = 1

/** Width of an expense moment on home. */
export function expenseCardWidth(windowWidth: number) {
  return Math.min(220, windowWidth - 112)
}
