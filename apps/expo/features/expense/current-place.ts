import * as Location from 'expo-location'

import { formatPlaceLabel } from './capture-model'

export type CurrentPlace = { label: string; latitude: string; longitude: string }

/**
 * Where the user is now, for the “current location” button. Only called from that explicit tap, so
 * this is the one place in the capture flow allowed to ask for the permission.
 */
export async function readCurrentPlace(): Promise<CurrentPlace | 'denied' | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync()
    if (!granted) return 'denied'
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
    const latitude = coords.latitude.toFixed(6)
    const longitude = coords.longitude.toFixed(6)
    const addresses = await Location.reverseGeocodeAsync(coords).catch(() => [])
    const label = addresses[0] ? formatPlaceLabel(addresses[0]) : ''
    return { label: label || `${latitude}, ${longitude}`, latitude, longitude }
  } catch {
    return null
  }
}
