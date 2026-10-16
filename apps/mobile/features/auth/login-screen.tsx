import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, fonts } from '@/features/ui/theme'
import { useSession } from './session'

export function LoginScreen() {
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>BILLET</Text>
        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục nhật ký chi tiêu của bạn.</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Mật khẩu"
          autoCapitalize="none"
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="Mật khẩu"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={submitting || !email.trim() || !password}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator color="#3A1D0E" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#3A1D0E', fontFamily: fonts.semibold, fontSize: 16 },
  card: { gap: 14, marginHorizontal: 24, maxWidth: 440, width: '88%' },
  error: { color: '#B3433C', fontFamily: fonts.regular, fontSize: 13 },
  eyebrow: { color: colors.link, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.75 },
  safe: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center' },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 32 },
})
