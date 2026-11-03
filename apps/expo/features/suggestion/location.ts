import * as Location from 'expo-location'
import { Platform } from 'react-native'

import { toPlaceKey } from './keys'

// Coarse place key (7-character geohash, ~150 m) for rules and the Decision request. Billet never
// asks for location permission to make a suggestion: without an existing grant this returns null.

const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000
const LAST_KNOWN_ACCURACY_M = 300

export type LocationPermission = { granted: boolean; canAskAgain: boolean }

export async function getLocationPermission(): Promise<LocationPermission | null> {
  if (Platform.OS === 'web') return null
  try {
    const { granted, canAskAgain } = await Location.getForegroundPermissionsAsync()
    return { granted, canAskAgain }
  } catch {
    return null
  }
}

export async function readPlaceKey(): Promise<string | null> {
  const permission = await getLocationPermission()
  if (!permission?.granted) return null
  try {
    const position =
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_ACCURACY_M,
      })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
    return toPlaceKey(position.coords.latitude, position.coords.longitude)
  } catch {
    return null
  }
}
