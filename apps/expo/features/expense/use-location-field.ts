import { useRef, useState } from 'react'

import { readCurrentPlace } from './current-place'

/** The location text of an expense, typed or filled from the current position. */
export function useLocationField(initial = '') {
  const [location, setLocation] = useState(initial)
  const [coordinates, setCoordinates] = useState<{ latitude: string; longitude: string } | null>(
    null,
  )
  const [locating, setLocating] = useState(false)
  // Bumped when the text is typed, so a slower GPS result does not overwrite it.
  const revision = useRef(0)

  const changeLocation = (value: string) => {
    revision.current += 1
    setLocation(value)
    setCoordinates(null)
  }

  /** Returns a message for the user when no place could be filled. */
  const fillCurrentPlace = async (): Promise<string | null> => {
    const startedAt = revision.current
    setLocating(true)
    const place = await readCurrentPlace()
    setLocating(false)
    if (place === 'denied') return 'Billet chưa có quyền truy cập vị trí. Bạn vẫn có thể nhập tay.'
    if (!place) return 'Không lấy được vị trí hiện tại. Bạn vẫn có thể nhập tay.'
    if (startedAt === revision.current) {
      setLocation(place.label)
      setCoordinates({ latitude: place.latitude, longitude: place.longitude })
    }
    return null
  }

  return { changeLocation, coordinates, fillCurrentPlace, locating, location }
}
