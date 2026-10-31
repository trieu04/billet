import { Feather } from '@expo/vector-icons'
import { type Href, router } from 'expo-router'
import { StyleSheet, Text } from 'react-native'

import { useSession } from '@/features/auth/session'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

export function AccountButton() {
  const { user } = useSession()
  const initial = user?.displayName.trim().slice(0, 1).toUpperCase()

  return (
    <AnimatedPressable
      accessibilityHint="Mở hồ sơ và cài đặt"
      accessibilityLabel="Tài khoản"
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => router.push('/profile' as Href)}
      pressedScale={0.92}
      style={styles.button}
    >
      {initial ? (
        <Text style={styles.initial}>{initial}</Text>
      ) : (
        <Feather color={colors.linkStrong} name="user" size={18} />
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderColor: colors.card,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    width: 40,
  },
  initial: { color: colors.linkStrong, fontFamily: fonts.bold, fontSize: 16 },
})
