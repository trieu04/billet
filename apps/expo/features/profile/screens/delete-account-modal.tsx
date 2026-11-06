import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { DELETE_CONFIRMATION_WORD, isDeleteConfirmed } from './delete-confirmation'

type Props = {
  visible: boolean
  onCancel(): void
  requestCode(): Promise<string>
  confirmDelete(code: string): Promise<void>
}

export function DeleteAccountModal({ visible, ...rest }: Props) {
  return (
    <Modal animationType="fade" onRequestClose={rest.onCancel} transparent visible={visible}>
      {visible ? <DeleteAccountForm {...rest} /> : null}
    </Modal>
  )
}

function DeleteAccountForm({ onCancel, requestCode, confirmDelete }: Omit<Props, 'visible'>) {
  const [code, setCode] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    requestCode().then(
      (value) => active && setCode(value),
      (reason) =>
        active && setError(reason instanceof Error ? reason.message : 'Vui lòng thử lại.'),
    )
    return () => {
      active = false
    }
  }, [requestCode])

  const canDelete = code !== null && isDeleteConfirmed(input) && !deleting

  async function submit() {
    if (!code || !canDelete) return
    setDeleting(true)
    setError(null)
    try {
      await confirmDelete(code)
    } catch (reason) {
      setDeleting(false)
      setError(reason instanceof Error ? reason.message : 'Vui lòng thử lại.')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <View accessibilityViewIsModal style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Xóa tài khoản?
        </Text>
        <Text style={styles.body}>
          Toàn bộ khoản chi, ảnh, danh mục, cài đặt và phiên đăng nhập sẽ bị xóa vĩnh viễn. Hành
          động này không thể hoàn tác.
        </Text>
        <Text style={styles.label}>
          Nhập <Text style={styles.word}>{DELETE_CONFIRMATION_WORD}</Text> để xác nhận
        </Text>
        <TextInput
          accessibilityLabel={`Nhập ${DELETE_CONFIRMATION_WORD} để xác nhận xóa tài khoản`}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!deleting}
          onChangeText={setInput}
          onSubmitEditing={submit}
          placeholder={DELETE_CONFIRMATION_WORD}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          style={styles.input}
          value={input}
        />
        {code === null && !error ? <ActivityIndicator style={styles.status} /> : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <AnimatedPressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={onCancel}
            style={styles.button}
          >
            <Text style={styles.cancel}>Hủy</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDelete, busy: deleting }}
            disabled={!canDelete}
            onPress={submit}
            style={[styles.button, !canDelete && styles.disabled]}
          >
            <Text style={styles.confirm}>{deleting ? 'Đang xóa…' : 'Xóa tài khoản'}</Text>
          </AnimatedPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  body: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginTop: 8 },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  cancel: { color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '100%' },
  confirm: { color: '#B23B32', fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.4 },
  error: { color: '#B23B32', fontFamily: fonts.regular, fontSize: 13, marginTop: 8 },
  input: {
    borderColor: colors.textSecondary,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  label: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, marginTop: 16 },
  status: { marginTop: 8 },
  title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
  word: { fontFamily: fonts.semibold },
})
