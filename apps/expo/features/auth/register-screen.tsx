import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { apiRequest } from '@/features/api/client'
import { AuthButton, AuthForm, AuthInput, authStyles } from './auth-form'
import { useSession } from './session'

export function RegisterScreen() {
  const { register } = useSession()
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [verification, setVerification] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!verification) {
        await apiRequest('/auth/register/verification/request', {
          method: 'POST',
          body: { method: 'email', email: form.email },
        })
        setVerification(true)
      } else {
        const result = await apiRequest<{ verificationToken: string }>(
          '/auth/register/verification/confirm',
          { method: 'POST', body: { method: 'email', email: form.email, code: form.code } },
        )
        await register({ ...form, verificationToken: result.verificationToken })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng ký')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title={verification ? 'Xác nhận email' : 'Tạo tài khoản'}
      subtitle={
        verification
          ? `Nhập mã 4 số đã gửi tới ${form.email}.`
          : 'Bắt đầu lưu lại những câu chuyện chi tiêu của bạn.'
      }
    >
      {!verification && (
        <>
          <AuthInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
          />
          <AuthInput
            accessibilityLabel="Mật khẩu"
            autoComplete="new-password"
            placeholder="Mật khẩu (chữ hoa, chữ thường và số)"
            secureTextEntry
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
          />
        </>
      )}
      {verification && (
        <AuthInput
          accessibilityLabel="Mã xác nhận"
          autoComplete="one-time-code"
          keyboardType="number-pad"
          maxLength={4}
          placeholder="Mã xác nhận"
          value={form.code}
          onChangeText={(code) => setForm({ ...form, code })}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={authStyles.error}>
          {error}
        </Text>
      )}
      <AuthButton
        label={verification ? 'Xác nhận & đăng ký' : 'Gửi mã xác nhận'}
        disabled={busy || (verification ? form.code.length !== 4 : !form.email || !form.password)}
        onPress={() => void submit()}
      />
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={authStyles.link}>Quay lại đăng nhập</Text>
      </Pressable>
    </AuthForm>
  )
}
