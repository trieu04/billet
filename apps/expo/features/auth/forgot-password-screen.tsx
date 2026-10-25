import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { apiRequest } from '@/features/api/client'
import { AuthButton, AuthForm, AuthInput, authStyles } from './auth-form'

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [requested, setRequested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!requested) {
        await apiRequest('/auth/password-reset/request', { method: 'POST', body: { email } })
        setRequested(true)
      } else {
        await apiRequest('/auth/password-reset', {
          method: 'POST',
          body: { email, code, newPassword: password },
        })
        router.replace('/login')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đặt lại mật khẩu')
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthForm
      title={requested ? 'Đặt mật khẩu mới' : 'Quên mật khẩu'}
      subtitle={
        requested
          ? `Nhập mã 4 số đã gửi tới ${email}.`
          : 'Chúng tôi sẽ gửi mã đặt lại nếu email thuộc một tài khoản đã xác minh.'
      }
    >
      {!requested ? (
        <AuthInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
      ) : (
        <>
          <AuthInput
            accessibilityLabel="Mã xác nhận"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={4}
            placeholder="Mã xác nhận"
            value={code}
            onChangeText={setCode}
          />
          <AuthInput
            accessibilityLabel="Mật khẩu mới"
            autoComplete="new-password"
            placeholder="Mật khẩu mới"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={authStyles.error}>
          {error}
        </Text>
      )}
      <AuthButton
        label={requested ? 'Đổi mật khẩu' : 'Gửi mã đặt lại'}
        disabled={busy || (requested ? code.length !== 4 || !password : !email)}
        onPress={() => void submit()}
      />
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={authStyles.link}>Quay lại đăng nhập</Text>
      </Pressable>
    </AuthForm>
  )
}
