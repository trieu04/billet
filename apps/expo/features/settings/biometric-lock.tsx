/* oxlint-disable react/only-export-components */
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState, Platform, StyleSheet, Text, View } from 'react-native'

import { useSession } from '@/features/auth/session'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

const BIOMETRIC_KEY = 'billet.biometric-lock'

type BiometricContextValue = {
  available: boolean
  enabled: boolean
  loading: boolean
  setEnabled(value: boolean): Promise<boolean>
}

const BiometricContext = createContext<BiometricContextValue | null>(null)

export function BiometricLockProvider({ children }: PropsWithChildren) {
  const { logout, token } = useSession()
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabledState] = useState(false)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: 'Hủy',
      disableDeviceFallback: false,
      fallbackLabel: 'Dùng mật mã thiết bị',
      promptMessage: 'Mở khóa Billet',
    })
    setLocked(!result.success)
    return result.success
  }, [])

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') {
        setLoading(false)
        return
      }
      const [hardware, enrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(BIOMETRIC_KEY),
      ])
      const isAvailable = hardware && enrolled
      const isEnabled = isAvailable && stored === 'enabled'
      setAvailable(isAvailable)
      setEnabledState(isEnabled)
      setLocked(isEnabled)
      setLoading(false)
      if (isEnabled && token) await authenticate()
    })()
  }, [authenticate, token])

  useEffect(() => {
    if (!enabled || !token) return
    let backgrounded = false
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgrounded = true
      if (state === 'active' && backgrounded) {
        backgrounded = false
        setLocked(true)
        void authenticate()
      }
    })
    return () => subscription.remove()
  }, [authenticate, enabled, token])

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        if (!available || !(await authenticate())) return false
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'enabled')
      } else {
        await SecureStore.deleteItemAsync(BIOMETRIC_KEY)
      }
      setEnabledState(value)
      setLocked(false)
      return true
    },
    [authenticate, available],
  )

  const value = useMemo(
    () => ({ available, enabled, loading, setEnabled }),
    [available, enabled, loading, setEnabled],
  )

  return (
    <BiometricContext.Provider value={value}>
      {children}
      {locked && token ? (
        <View accessibilityViewIsModal style={styles.lock}>
          <Text style={styles.lockTitle}>Billet đang được khóa</Text>
          <Text style={styles.lockBody}>
            Xác thực bằng sinh trắc hoặc mật mã thiết bị để tiếp tục.
          </Text>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => void authenticate()}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Mở khóa</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Đăng xuất</Text>
          </AnimatedPressable>
        </View>
      ) : null}
    </BiometricContext.Provider>
  )
}

export function useBiometricLock() {
  const value = useContext(BiometricContext)
  if (!value) throw new Error('useBiometricLock must be used inside BiometricLockProvider')
  return value
}

const styles = StyleSheet.create({
  lock: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 32,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  lockBody: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  lockTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 24 },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 14,
    marginTop: 28,
    minHeight: 48,
    justifyContent: 'center',
    width: '100%',
  },
  primaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  secondary: { alignItems: 'center', justifyContent: 'center', marginTop: 12, minHeight: 44 },
  secondaryText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 15 },
})
