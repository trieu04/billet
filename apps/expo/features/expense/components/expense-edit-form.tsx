import { Feather } from '@expo/vector-icons'
import { usePreventRemove } from 'expo-router/react-navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
  type ViewInstance,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney } from '@/features/api/format'
import type { Category, Expense } from '@/features/api/types'
import { CategoryPicker } from '@/features/category/components/category-picker'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'
import { useKeyboardVisible } from '@/features/ui/use-keyboard-visible'

import {
  amountSuggestionValues,
  formatDateTimeInput,
  parseCaptureAmount,
  parseDateTimeInput,
} from '../capture-model'
import { useKeepFocusedVisible } from '../use-keep-focused-visible'
import { useLocationField } from '../use-location-field'
import { ExpenseDetailRow } from './expense-detail-row'
import { ExpenseFormHeader } from './expense-form-header'
import { ExpenseInputBar, type InputBarSuggestion } from './expense-input-bar'
import { PhotoExpenseEditor } from './photo-expense-editor'

export type ExpenseEditField = 'merchant' | 'location' | 'time'
type ActiveField = 'amount' | 'caption' | ExpenseEditField

const fieldNames: Record<ActiveField, string> = {
  amount: 'Số tiền',
  caption: 'Tiêu đề',
  merchant: 'Cửa hàng',
  location: 'Địa điểm',
  time: 'Thời gian',
}

/** Edits a saved expense with the same layout as the review after taking a photo. */
export function ExpenseEditForm({
  categories,
  expense,
  initialField,
  onCancel,
  onCategoryCreated,
  onSaved,
  photo,
  token,
}: {
  categories: Category[]
  expense: Expense
  /** Field to start typing in, when the edit started from that field. */
  initialField?: ExpenseEditField
  onCancel(): void
  onCategoryCreated(category: Category): void
  onSaved(expense: Expense): void
  /** The photo, behind the editable caption and amount. */
  photo: ReactNode
  token: string
}) {
  const initialTime = formatDateTimeInput(expense.occurredAt)
  const [amount, setAmount] = useState(expense.amountMinor)
  const [caption, setCaption] = useState(expense.caption ?? '')
  const [merchant, setMerchant] = useState(expense.merchant ?? '')
  const [categoryId, setCategoryId] = useState(expense.categoryId)
  const [time, setTime] = useState(initialTime)
  const { changeLocation, coordinates, fillCurrentPlace, locating, location } = useLocationField(
    expense.location ?? '',
  )
  const [activeField, setActiveField] = useState<ActiveField | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keyboardVisible = useKeyboardVisible()
  const { blurred, contentRef, focused, scrollProps, scrollRef } = useKeepFocusedVisible()
  const amountRef = useRef<TextInputInstance>(null)
  const captionRef = useRef<TextInputInstance>(null)
  const merchantRef = useRef<TextInputInstance>(null)
  const locationRef = useRef<TextInputInstance>(null)
  const timeRef = useRef<TextInputInstance>(null)
  const heroBlock = useRef<ViewInstance>(null)
  const categoriesBlock = useRef<ViewInstance>(null)
  const merchantBlock = useRef<ViewInstance>(null)
  const locationBlock = useRef<ViewInstance>(null)
  const timeBlock = useRef<ViewInstance>(null)
  const locationChanged = location !== (expense.location ?? '')
  const dirty =
    amount !== expense.amountMinor ||
    caption !== (expense.caption ?? '') ||
    merchant !== (expense.merchant ?? '') ||
    categoryId !== expense.categoryId ||
    time !== initialTime ||
    locationChanged

  useEffect(() => {
    if (!initialField) return
    const inputs = { location: locationRef, merchant: merchantRef, time: timeRef }
    const frame = requestAnimationFrame(() => inputs[initialField].current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [initialField])

  const discard = () =>
    Alert.alert('Bỏ thay đổi?', 'Những gì bạn vừa sửa sẽ không được lưu.', [
      { text: 'Tiếp tục sửa', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: onCancel },
    ])
  const close = () => {
    if (dirty) discard()
    else onCancel()
  }

  usePreventRemove(dirty && !saving && !leaving, discard)

  const save = async () => {
    if (saving) return
    const amountMinor = parseCaptureAmount(amount)
    if (!amountMinor) {
      setError('Nhập số tiền lớn hơn 0, chỉ gồm các chữ số.')
      amountRef.current?.focus()
      return
    }
    const occurredAt = time === initialTime ? undefined : parseDateTimeInput(time)
    if (occurredAt === null) {
      setError('Nhập thời gian theo dạng DD/MM/YYYY HH:mm.')
      timeRef.current?.focus()
      return
    }
    Keyboard.dismiss()
    setSaving(true)
    setError(null)
    try {
      const updated = await apiRequest<Expense>(`/expenses/${expense.id}`, {
        method: 'PATCH',
        token,
        body: {
          version: expense.version,
          amountMinor,
          caption: caption.trim() || null,
          categoryId,
          merchant: merchant.trim() || null,
          ...(occurredAt ? { occurredAt } : {}),
          ...(locationChanged
            ? {
                location: location.trim() || null,
                latitude: coordinates?.latitude ?? null,
                longitude: coordinates?.longitude ?? null,
              }
            : {}),
        },
      })
      setLeaving(true)
      onSaved(updated)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu. Hãy thử lại.')
      setSaving(false)
    }
  }

  const fieldFocused = (field: ActiveField, block: ViewInstance | null) => {
    setActiveField(field)
    focused(block)
  }
  const fieldBlurred = (field: ActiveField, block: ViewInstance | null) => {
    setActiveField((current) => (current === field ? null : current))
    blurred(block)
  }
  const barSuggestions: InputBarSuggestion[] =
    activeField === 'amount'
      ? amountSuggestionValues(amount, []).map((value) => ({
          key: value,
          value: formatMoney(value),
          source: null,
          onPress: () => {
            setAmount(value)
            setError(null)
          },
        }))
      : activeField === 'caption'
        ? [merchant.trim()]
            .filter((name) => name && name !== caption.trim())
            .map((name) => ({
              key: `caption-${name}`,
              value: name,
              source: null,
              onPress: () => setCaption(name),
            }))
        : activeField === 'location'
          ? [
              {
                key: 'current-location',
                value: 'Vị trí hiện tại',
                source: null,
                icon: 'navigation',
                busy: locating,
                onPress: () => void fillCurrentPlace().then(setError),
              },
            ]
          : activeField === 'time'
            ? [
                ...(time !== initialTime
                  ? [
                      {
                        key: 'original-time',
                        value: initialTime,
                        source: 'Giờ ban đầu',
                        icon: 'clock' as const,
                        onPress: () => setTime(initialTime),
                      },
                    ]
                  : []),
                {
                  key: 'now',
                  value: 'Bây giờ',
                  source: null,
                  icon: 'clock' as const,
                  onPress: () => setTime(formatDateTimeInput(new Date().toISOString())),
                },
              ]
            : []

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ExpenseFormHeader
        closeLabel="Hủy chỉnh sửa"
        onClose={close}
        onSave={() => void save()}
        saveLabel="Lưu"
        saving={saving}
        savingLabel="Đang lưu…"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.body}
      >
        <ScrollView
          {...scrollProps}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View ref={contentRef} collapsable={false} style={styles.content}>
            <View ref={heroBlock} collapsable={false} style={styles.photo}>
              {photo}
              <PhotoExpenseEditor
                amount={amount}
                amountRef={amountRef}
                caption={caption}
                captionPlaceholder={merchant.trim() || 'Thêm tiêu đề'}
                captionRef={captionRef}
                category={categories.find((item) => item.id === categoryId)}
                disabled={saving}
                onAmountChange={(value) => {
                  setAmount(value)
                  setError(null)
                }}
                onBlur={(field) => fieldBlurred(field, heroBlock.current)}
                onCaptionChange={setCaption}
                onCategoryPress={() => {
                  Keyboard.dismiss()
                  focused(categoriesBlock.current)
                }}
                onFocus={(field) => fieldFocused(field, heroBlock.current)}
              />
            </View>
            <View ref={categoriesBlock} collapsable={false} style={styles.categories}>
              <CategoryPicker
                categories={categories}
                disabled={saving}
                onCreated={(category) => {
                  onCategoryCreated(category)
                  setCategoryId(category.id)
                }}
                onSelect={setCategoryId}
                selectedId={categoryId}
              />
            </View>
            <View style={styles.details}>
              <ExpenseDetailRow
                disabled={saving}
                icon="shopping-bag"
                label="Cửa hàng"
                onPress={() => merchantRef.current?.focus()}
                ref={merchantBlock}
              >
                <TextInput
                  ref={merchantRef}
                  accessibilityLabel="Tên cửa hàng"
                  editable={!saving}
                  maxLength={160}
                  onBlur={() => fieldBlurred('merchant', merchantBlock.current)}
                  onChangeText={setMerchant}
                  onFocus={() => fieldFocused('merchant', merchantBlock.current)}
                  placeholder="Thêm cửa hàng"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.input}
                  value={merchant}
                />
              </ExpenseDetailRow>
              <ExpenseDetailRow
                disabled={saving}
                icon="map-pin"
                label="Địa điểm"
                onPress={() => locationRef.current?.focus()}
                ref={locationBlock}
                trailing={
                  <AnimatedPressable
                    accessibilityLabel="Dùng vị trí hiện tại"
                    accessibilityRole="button"
                    accessibilityState={{ busy: locating, disabled: saving || locating }}
                    disabled={saving || locating}
                    onPress={() => void fillCurrentPlace().then(setError)}
                    style={styles.locate}
                  >
                    {locating ? (
                      <ActivityIndicator color={colors.link} size="small" />
                    ) : (
                      <Feather color={colors.link} name="navigation" size={18} />
                    )}
                  </AnimatedPressable>
                }
              >
                <TextInput
                  ref={locationRef}
                  accessibilityLabel="Địa điểm"
                  editable={!saving}
                  maxLength={240}
                  onBlur={() => fieldBlurred('location', locationBlock.current)}
                  onChangeText={changeLocation}
                  onFocus={() => fieldFocused('location', locationBlock.current)}
                  placeholder="Thêm địa điểm"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.input}
                  value={location}
                />
              </ExpenseDetailRow>
              <ExpenseDetailRow
                disabled={saving}
                icon="clock"
                label="Thời gian"
                onPress={() => timeRef.current?.focus()}
                ref={timeBlock}
              >
                <TextInput
                  ref={timeRef}
                  accessibilityHint="Nhập theo dạng ngày tháng năm, giờ phút"
                  accessibilityLabel="Thời gian chi tiêu"
                  editable={!saving}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  onBlur={() => fieldBlurred('time', timeBlock.current)}
                  onChangeText={setTime}
                  onFocus={() => fieldFocused('time', timeBlock.current)}
                  placeholder="DD/MM/YYYY HH:mm"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.input}
                  value={time}
                />
              </ExpenseDetailRow>
            </View>
          </View>
        </ScrollView>
        {error ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {keyboardVisible ? (
          <ExpenseInputBar
            disabled={saving}
            field={activeField ? fieldNames[activeField] : 'Khoản chi'}
            suggestions={barSuggestions}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  categories: { gap: 12, paddingHorizontal: 4 },
  content: { gap: 16, paddingBottom: 24, paddingHorizontal: 16 },
  details: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 20,
    marginTop: -1,
    overflow: 'hidden',
  },
  error: {
    color: '#B3433C',
    fontFamily: fonts.medium,
    fontSize: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  input: { color: colors.text, fontFamily: fonts.medium, fontSize: 16, minHeight: 24, padding: 0 },
  locate: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  photo: {
    aspectRatio: expensePhotoAspectRatio,
    backgroundColor: colors.camera,
    borderCurve: 'continuous',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  safe: { backgroundColor: colors.canvas, flex: 1 },
})
