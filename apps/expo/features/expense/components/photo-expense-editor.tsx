import { Feather } from '@expo/vector-icons'
import { type Ref, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, type TextInputInstance, View } from 'react-native'

import type { Category } from '@/features/api/types'
import { fonts } from '@/features/ui/theme'

import { amountDigits, formatAmountInput } from '../capture-model'
import {
  PhotoCategoryTag,
  photoFieldBackground,
  PhotoOverlaySurface,
} from './photo-expense-overlay'

const placeholderColor = 'rgba(255,255,255,0.72)'
/** Past this many digits the amount drops a size so it still fits beside the category. */
const LONG_AMOUNT_DIGITS = 10

type Props = {
  /** Amount as plain digits. */
  amount: string
  amountRef: Ref<TextInputInstance>
  caption: string
  captionPlaceholder: string
  captionRef: Ref<TextInputInstance>
  category?: Category
  disabled?: boolean
  onAmountChange(digits: string): void
  onBlur?(field: 'amount' | 'caption'): void
  onCaptionChange(value: string): void
  onCategoryPress(): void
  onFocus?(field: 'amount' | 'caption'): void
}

/** The photo overlay with caption and amount editable in place, plus the chosen category. */
export function PhotoExpenseEditor({
  amount,
  amountRef,
  caption,
  captionPlaceholder,
  captionRef,
  category,
  disabled,
  onAmountChange,
  onBlur,
  onCaptionChange,
  onCategoryPress,
  onFocus,
}: Props) {
  const [focused, setFocused] = useState<'amount' | 'caption' | null>(null)
  const [captionMultiline, setCaptionMultiline] = useState(false)
  const formatted = formatAmountInput(amount)
  const amountFont = amount.length > LONG_AMOUNT_DIGITS ? styles.amountTextLong : styles.amountText
  const focusHandlers = (field: 'amount' | 'caption') => ({
    onBlur: () => {
      setFocused((current) => (current === field ? null : current))
      onBlur?.(field)
    },
    onFocus: () => {
      setFocused(field)
      onFocus?.(field)
    },
  })

  return (
    <PhotoOverlaySurface interactive style={styles.surface}>
      {/* The whole row focuses the caption, even where the field hugs a short text. */}
      <Pressable
        accessible={false}
        disabled={disabled}
        onPress={() => focusInput(captionRef)}
        style={styles.captionRow}
      >
        <View
          style={[
            styles.field,
            captionMultiline ? styles.captionMultiline : styles.fieldRound,
            focused === 'caption' && styles.fieldFocused,
          ]}
        >
          {/* A TextInput does not resize to its text, so hidden text sets the size. */}
          <View>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              onTextLayout={({ nativeEvent }) => setCaptionMultiline(nativeEvent.lines.length > 1)}
              style={[styles.captionText, styles.sizer]}
            >
              {caption || captionPlaceholder}
            </Text>
            <TextInput
              {...focusHandlers('caption')}
              ref={captionRef}
              accessibilityLabel="Tiêu đề khoản chi"
              editable={!disabled}
              maxLength={120}
              multiline
              onChangeText={onCaptionChange}
              placeholder={captionPlaceholder}
              placeholderTextColor={placeholderColor}
              returnKeyType="done"
              scrollEnabled={false}
              style={[styles.captionText, styles.captionInput]}
              submitBehavior="blurAndSubmit"
              value={caption}
            />
          </View>
        </View>
      </Pressable>
      <View style={styles.bottomRow}>
        <Pressable
          accessible={false}
          disabled={disabled}
          onPress={() => focusInput(amountRef)}
          style={[
            styles.field,
            styles.fieldRound,
            styles.amountField,
            focused === 'amount' && styles.fieldFocused,
          ]}
        >
          <View>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              numberOfLines={1}
              style={[amountFont, styles.sizer]}
            >
              {formatted || '0'}
            </Text>
            <TextInput
              {...focusHandlers('amount')}
              ref={amountRef}
              accessibilityLabel="Số tiền chi tiêu"
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={19}
              onChangeText={(value) => onAmountChange(amountDigits(value))}
              placeholder="0"
              placeholderTextColor={placeholderColor}
              selectTextOnFocus
              style={[amountFont, styles.amountInput]}
              value={formatted}
            />
          </View>
          <Text style={amountFont}>₫</Text>
        </Pressable>
        <Pressable
          accessibilityHint="Đi tới phần chọn danh mục"
          accessibilityLabel={category ? `Danh mục: ${category.name}` : 'Chọn danh mục'}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onCategoryPress}
          style={[styles.field, styles.fieldRound, styles.categoryTag]}
        >
          {category ? (
            <PhotoCategoryTag category={category} large />
          ) : (
            <Text style={styles.categoryPlaceholder}>Danh mục</Text>
          )}
          <Feather color="white" name="chevron-down" size={14} />
        </Pressable>
      </View>
    </PhotoOverlaySurface>
  )
}

function focusInput(ref: Ref<TextInputInstance>) {
  if (ref && typeof ref === 'object') ref.current?.focus()
}

const styles = StyleSheet.create({
  amountField: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, minWidth: 76 },
  amountInput: { ...StyleSheet.absoluteFill, padding: 0, textAlign: 'left' },
  amountText: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  amountTextLong: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  captionInput: { ...StyleSheet.absoluteFill, padding: 0, paddingTop: 0 },
  captionMultiline: { borderRadius: 16 },
  captionRow: { alignItems: 'flex-start' },
  captionText: { color: 'white', fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19 },
  categoryPlaceholder: { color: 'white', fontFamily: fonts.medium, fontSize: 14 },
  categoryTag: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    paddingLeft: 9,
    paddingRight: 10,
  },
  field: {
    backgroundColor: photoFieldBackground,
    borderColor: 'transparent',
    borderCurve: 'continuous',
    borderWidth: 1.5,
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fieldFocused: { backgroundColor: 'rgba(255,255,255,0.26)', borderColor: 'white' },
  fieldRound: { borderRadius: 22 },
  sizer: { opacity: 0, paddingRight: 2 },
  surface: { gap: 8, paddingBottom: 12, paddingHorizontal: 12, paddingTop: 64 },
})
