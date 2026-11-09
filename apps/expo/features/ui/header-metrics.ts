/** Apple's 44pt bar plus 4pt of air above and below its 44pt button targets. */
export const headerRowHeight = 52
export const headerFadeHeight = 0
/** Weekday strip the calendar tab adds to the bottom of the shared header. */
export const weekdayBarHeight = 32

/** Top space a screen reserves so its content starts below the header and its fade. */
export function headerHeight(topInset: number) {
  return topInset + headerRowHeight + headerFadeHeight
}
