import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { type Href, router } from 'expo-router'
import { useState, type ComponentProps } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { colors, fonts } from '@/features/ui/theme'
import { useSession } from './session'

WebBrowser.maybeCompleteAuthSession()

export function LoginScreen() {
  const { login, socialLogin } = useSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleEnabled = Boolean(
    Platform.select({
      web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    }),
  )
  const appleEnabled = Platform.OS === 'ios' && Boolean(process.env.EXPO_PUBLIC_APPLE_CLIENT_ID)
  const socialEnabled = googleEnabled || appleEnabled

  const run = async (action: () => Promise<void>) => {
    setSubmitting(true)
    setError(null)
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập')
    } finally {
      setSubmitting(false)
    }
  }

  const apple = () =>
    run(async () => {
      const result = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!result.identityToken) throw new Error('Apple không trả về token đăng nhập')
      const displayName = [result.fullName?.givenName, result.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
      await socialLogin('apple', result.identityToken, displayName || undefined)
    })

  return (
    <ScrollView contentContainerStyle={styles.safe} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>BILLET</Text>
        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Tiếp tục nhật ký chi tiêu của bạn.</Text>
        {socialEnabled && (
          <View style={styles.socialRow}>
            {googleEnabled && (
              <GoogleLoginButton
                disabled={submitting}
                onLogin={(identityToken) => socialLogin('google', identityToken)}
                run={run}
              />
            )}
            {appleEnabled && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                cornerRadius={24}
                style={styles.appleButton}
                onPress={() => void apple()}
              />
            )}
          </View>
        )}
        {socialEnabled && (
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>HOẶC</Text>
            <View style={styles.line} />
          </View>
        )}
        <TextInput
          accessibilityLabel="Tên đăng nhập, email hoặc số điện thoại"
          autoCapitalize="none"
          autoComplete="username"
          onChangeText={setIdentifier}
          placeholder="Username, email hoặc số điện thoại"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={identifier}
        />
        <TextInput
          accessibilityLabel="Mật khẩu"
          autoCapitalize="none"
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => void run(() => login(identifier, password))}
          placeholder="Mật khẩu"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/forgot-password' as Href)}
        >
          <Text style={styles.link}>Quên mật khẩu?</Text>
        </Pressable>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={submitting || !identifier.trim() || !password}
          onPress={() => void run(() => login(identifier, password))}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator color="#3A1D0E" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/register' as Href)}>
          <Text style={styles.register}>
            Chưa có tài khoản? <Text style={styles.link}>Đăng ký</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

function GoogleLoginButton({
  disabled,
  onLogin,
  run,
}: {
  disabled: boolean
  onLogin: (identityToken: string) => Promise<void>
  run: (action: () => Promise<void>) => Promise<void>
}) {
  const [request, , prompt] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    selectAccount: true,
  })

  return (
    <SocialButton
      label="Google"
      disabled={!request || disabled}
      onPress={() =>
        void run(async () => {
          const result = await prompt()
          if (result.type !== 'success' || !result.params.id_token)
            throw new Error('Google Sign-In đã bị hủy')
          await onLogin(result.params.id_token)
        })
      }
    />
  )
}

function SocialButton({ label, ...props }: { label: string } & ComponentProps<typeof Pressable>) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
    >
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  appleButton: { flex: 1, height: 50 },
  button: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderCurve: 'continuous',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#3A1D0E', fontFamily: fonts.semibold, fontSize: 16 },
  card: { gap: 14, maxWidth: 440, width: '100%' },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  error: { color: '#B3433C', fontFamily: fonts.regular, fontSize: 13 },
  eyebrow: { color: colors.link, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 16,
  },
  line: { backgroundColor: colors.line, flex: 1, height: 1 },
  link: { color: colors.link, fontFamily: fonts.semibold, fontSize: 14 },
  or: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  pressed: { opacity: 0.72 },
  register: { color: colors.textSecondary, fontFamily: fonts.regular, textAlign: 'center' },
  safe: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: 'center',
  },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 32 },
})
