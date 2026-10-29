/* oxlint-disable react/set-state-in-effect */
import { Feather } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import type { Category } from '@/features/api/types'
import { useSession } from '@/features/auth/session'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { categoryColors, categoryIcon, categoryIcons } from '../category-options'

type CategoryDraft = Pick<Category, 'name' | 'color' | 'icon'>

export function CategoryFormModal({
  category,
  onDismiss,
  onSaved,
  visible,
}: {
  category?: Category | null
  onDismiss(): void
  onSaved(category: Category): void
  visible: boolean
}) {
  const { token } = useSession()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(categoryColors[0])
  const [icon, setIcon] = useState<string>('coffee')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setName(category?.name ?? '')
    setColor(category?.color ?? categoryColors[0])
    setIcon(category?.icon ?? 'coffee')
    setError(null)
  }, [category, visible])

  const save = async () => {
    if (!token || saving || !name.trim()) return
    setSaving(true)
    setError(null)
    const draft: CategoryDraft = { name: name.trim(), color, icon }
    try {
      const saved = await apiRequest<Category>(
        category ? `/categories/${category.id}` : '/categories',
        {
          body: draft,
          method: category ? 'PATCH' : 'POST',
          token,
        },
      )
      onSaved(saved)
      onDismiss()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu danh mục')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'fullScreen'}
      visible={visible}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safe}
        >
          <View style={styles.header}>
            <AnimatedPressable
              accessibilityLabel="Hủy"
              accessibilityRole="button"
              disabled={saving}
              onPress={onDismiss}
              style={styles.headerButton}
            >
              <Text style={styles.cancel}>Hủy</Text>
            </AnimatedPressable>
            <Text style={styles.title}>{category ? 'Sửa danh mục' : 'Danh mục mới'}</Text>
            <AnimatedPressable
              accessibilityLabel="Lưu danh mục"
              accessibilityRole="button"
              disabled={saving || !name.trim()}
              onPress={() => void save()}
              style={styles.headerButton}
            >
              {saving ? (
                <ActivityIndicator color={colors.link} />
              ) : (
                <Text style={styles.save}>Lưu</Text>
              )}
            </AnimatedPressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.preview}>
              <View style={[styles.previewIcon, { backgroundColor: color }]}>
                <Feather color={colors.text} name={categoryIcon(icon)} size={28} />
              </View>
              <Text numberOfLines={1} style={styles.previewName}>
                {name.trim() || 'Tên danh mục'}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tên</Text>
              <TextInput
                accessibilityLabel="Tên danh mục"
                autoCapitalize="sentences"
                autoComplete="off"
                maxLength={80}
                onChangeText={setName}
                placeholder="Ví dụ: Cà phê"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                style={styles.input}
                value={name}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Màu</Text>
              <View style={styles.options}>
                {categoryColors.map((value) => (
                  <AnimatedPressable
                    accessibilityLabel={`Chọn màu ${value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: color === value }}
                    key={value}
                    onPress={() => setColor(value)}
                    style={[styles.colorOption, { backgroundColor: value }]}
                  >
                    {color === value ? (
                      <Feather color={colors.text} name="check" size={19} />
                    ) : null}
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Biểu tượng</Text>
              <View style={styles.options}>
                {categoryIcons.map((value) => (
                  <AnimatedPressable
                    accessibilityLabel={`Chọn biểu tượng ${value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: icon === value }}
                    key={value}
                    onPress={() => setIcon(value)}
                    style={[styles.iconOption, icon === value && { backgroundColor: color }]}
                  >
                    <Feather color={colors.text} name={value} size={22} />
                  </AnimatedPressable>
                ))}
              </View>
            </View>
            {error ? (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  cancel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 16 },
  colorOption: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: { gap: 24, padding: 20, paddingBottom: 44 },
  error: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
  field: { gap: 12 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 8,
  },
  headerButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 64 },
  iconOption: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderCurve: 'continuous',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  input: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 14,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  preview: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  previewIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  previewName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18, maxWidth: '90%' },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  save: { color: colors.link, fontFamily: fonts.semibold, fontSize: 16 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
})
