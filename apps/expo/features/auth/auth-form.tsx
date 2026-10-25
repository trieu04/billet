/* oxlint-disable react/only-export-components */
import { type PropsWithChildren } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import { colors, fonts } from '@/features/ui/theme'

export function AuthForm({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <ScrollView contentContainerStyle={styles.safe} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>BILLET</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </ScrollView>
  )
}

export function AuthInput(props: TextInputProps) {
  return <TextInput {...props} placeholderTextColor={colors.textSecondary} style={styles.input} />
}

export function AuthButton({
  label,
  disabled,
  onPress,
}: {
  label: string
  disabled?: boolean
  onPress(): void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

export const authStyles = StyleSheet.create({
  error: { color: '#B3433C', fontFamily: fonts.regular, fontSize: 13 },
  link: { color: colors.link, fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  note: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
})

const styles = StyleSheet.create({
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
  dim: { opacity: 0.6 },
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
  safe: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 32 },
})
