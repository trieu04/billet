import { Feather } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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
import type { Category, Expense, MediaReservation } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { CategoryPicker } from '@/features/category/components/category-picker'
import { useShareInbox } from '@/features/share'
import { type SuggestionField, usePhotoSuggestion } from '@/features/suggestion'
import { useCaptureFlow } from '../capture-flow'
import {
  amountSuggestionValues,
  findCategoryIdByCode,
  formatDateTimeInput,
  parseCaptureAmount,
  parseDateTimeInput,
  parseSuggestionGeneration,
  type PhotoBounds,
} from '../capture-model'
import { ExpenseDetailRow } from '../components/expense-detail-row'
import { ExpenseFormHeader } from '../components/expense-form-header'
import { ExpenseInputBar, type InputBarSuggestion } from '../components/expense-input-bar'
import { PhotoExpenseEditor } from '../components/photo-expense-editor'
import {
  type FieldSuggestion,
  SourceBadge,
  SuggestionChip,
  SuggestionPending,
} from '../components/suggestion-chip'
import { useKeepFocusedVisible } from '../use-keep-focused-visible'
import { useLocationField } from '../use-location-field'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'
import { useKeyboardVisible } from '@/features/ui/use-keyboard-visible'

type ActiveField = 'amount' | 'caption' | 'merchant' | 'location' | 'time'

const inputBarFieldNames: Record<ActiveField, string> = {
  amount: 'Số tiền',
  caption: 'Tiêu đề',
  merchant: 'Cửa hàng',
  location: 'Địa điểm',
  time: 'Thời gian',
}

export function CaptureReviewScreen() {
  const { imageUri, capturedAt, categoryCode, suggestionGeneration, source, sharedImageId } =
    useLocalSearchParams<{
      imageUri?: string
      capturedAt?: string
      categoryCode?: string
      suggestionGeneration?: string
      source?: 'shared'
      sharedImageId?: string
    }>()
  const { token } = useSession()
  const { saveCapture, reportReviewState, replacementAllowed, finishReviewReplacement } =
    useCaptureFlow()
  const { completeSharedImage } = useShareInbox()
  const keyboardVisible = useKeyboardVisible()
  const { blurred, contentRef, focused, scrollProps, scrollRef } = useKeepFocusedVisible()
  const loadCategories = useCallback(
    (accessToken: string) => apiRequest<Category[]>('/categories', { token: accessToken }),
    [],
  )
  const {
    data: categories,
    error: categoryError,
    refresh,
    setData: setCategories,
  } = useApiResource(loadCategories)
  const [caption, setCaption] = useState('')
  const { changeLocation, coordinates, fillCurrentPlace, locating, location } = useLocationField()
  const [activeField, setActiveField] = useState<ActiveField | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [exitTo, setExitTo] = useState<'camera' | 'journal'>('journal')
  const [error, setError] = useState<string | null>(null)
  const [saveStage, setSaveStage] = useState('Đang lưu…')
  const locked = useRef(false)
  const captionRef = useRef<TextInputInstance>(null)
  const amountRef = useRef<TextInputInstance>(null)
  const merchantRef = useRef<TextInputInstance>(null)
  const locationRef = useRef<TextInputInstance>(null)
  const timeRef = useRef<TextInputInstance>(null)
  const photoRef = useRef<ViewInstance>(null)
  const heroBlock = useRef<ViewInstance>(null)
  const categoriesBlock = useRef<ViewInstance>(null)
  const merchantBlock = useRef<ViewInstance>(null)
  const locationBlock = useRef<ViewInstance>(null)
  const timeBlock = useRef<ViewInstance>(null)
  const uploadedMedia = useRef<string | undefined>(undefined)
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const [captureTime] = useState(() =>
    capturedAt && Number.isFinite(Date.parse(capturedAt)) ? capturedAt : new Date().toISOString(),
  )
  const suggestion = usePhotoSuggestion(
    parseSuggestionGeneration(suggestionGeneration),
    captureTime,
  )
  const { draft } = suggestion
  const amount = draft.values.amountMinor ?? ''
  const merchant = draft.values.merchant ?? ''
  const occurredAt = draft.values.occurredAt ?? captureTime
  const [timeEditor, setTimeEditor] = useState(() => ({
    source: occurredAt,
    value: formatDateTimeInput(occurredAt),
  }))
  const timeInput =
    timeEditor.source === occurredAt ? timeEditor.value : formatDateTimeInput(occurredAt)
  // A suggested category only counts once it is one of the account's categories.
  const draftCategory =
    draft.values.categoryId && categories?.some((item) => item.id === draft.values.categoryId)
      ? draft.values.categoryId
      : undefined
  const selectedCategory =
    draftCategory ?? findCategoryIdByCode(categories, categoryCode) ?? categories?.[0]?.id
  const selectedCategoryItem = categories?.find((item) => item.id === selectedCategory)
  const dirty = Boolean(imageUri || amount || caption || location || draft.locked)
  const occurredFromReceipt = draft.provenance.occurredAt?.source === 'ocr'
  const amountSource = suggestion.sourceLabel('amountMinor')
  const categorySource = draftCategory ? suggestion.sourceLabel('categoryId') : null
  const setAmount = (value: string) => suggestion.edit('amountMinor', value)
  // A machine amount leaves the draft once the user types over it; keep offering it.
  const [machineAmount, setMachineAmount] = useState<{
    value: string
    label: string | null
  } | null>(null)
  const currentMachineAmount =
    amount && draft.provenance.amountMinor?.source !== 'user' ? amount : null
  if (currentMachineAmount && currentMachineAmount !== machineAmount?.value) {
    setMachineAmount({ value: currentMachineAmount, label: amountSource })
  }
  const fieldFocused = (field: ActiveField, block: ViewInstance | null) => {
    setActiveField(field)
    focused(block)
  }
  const fieldBlurred = (field: ActiveField, block: ViewInstance | null) => {
    setActiveField((current) => (current === field ? null : current))
    blurred(block)
  }
  const selectCategory = (id: string) => suggestion.edit('categoryId', id)
  const userDirty = Boolean(caption.trim() || location.trim() || draft.locked)

  useEffect(() => {
    reportReviewState({
      active: true,
      draft: saving ? 'saving' : userDirty ? 'dirty' : 'clean',
      sharedImageId,
    })
  }, [reportReviewState, saving, sharedImageId, userDirty])

  useEffect(() => () => reportReviewState({ active: false, draft: 'idle' }), [reportReviewState])

  useEffect(() => {
    finishReviewReplacement()
  }, [finishReviewReplacement, sharedImageId])

  // “Use photo”: the form opens with the amount focused; focus alone does not lock the draft.
  useEffect(() => {
    const frame = requestAnimationFrame(() => amountRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  const confirmDiscard = (onDiscard: () => void) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Bỏ khoản chi đang chỉnh sửa? Ảnh và nội dung chưa lưu sẽ bị bỏ.'))
        onDiscard()
      return
    }
    Alert.alert('Bỏ khoản chi này?', 'Ảnh và nội dung chưa lưu sẽ bị bỏ.', [
      { text: 'Tiếp tục sửa', style: 'cancel' },
      { text: 'Bỏ khoản chi', style: 'destructive', onPress: onDiscard },
    ])
  }

  usePreventRemove(!replacementAllowed && !leaving && (dirty || saving), () => {
    if (!locked.current) {
      setExitTo(source === 'shared' ? 'journal' : 'camera')
      confirmDiscard(() => setLeaving(true))
    }
  })

  // Retake, cancel or leaving the screen ends the suggestion session; late results are dropped.
  const { begin: beginSuggestion, cancel: cancelSuggestion } = suggestion
  useEffect(() => cancelSuggestion, [cancelSuggestion])

  // Removal is retried only after the guard has rendered with leaving=true.
  const finishLeaving = useCallback(() => {
    if (!leaving) return
    void (async () => {
      cancelSuggestion()
      if (source === 'shared' && sharedImageId) await completeSharedImage(sharedImageId)
      if (exitTo === 'camera') {
        if (source === 'shared') router.replace('/capture')
        else router.dismissTo('/capture')
      } else router.dismissTo('/')
    })()
  }, [cancelSuggestion, completeSharedImage, exitTo, leaving, sharedImageId, source])

  useEffect(finishLeaving, [finishLeaving])

  const leave = (destination: 'camera' | 'journal') => {
    if (locked.current) return
    setExitTo(destination)
    // The menu choice is itself the confirmation, so no second dialog.
    setLeaving(true)
  }

  // The X opens a small menu: retake the photo, or leave for the journal.
  const openCloseMenu = () => {
    if (locked.current) return
    if (Platform.OS === 'web') {
      leave(globalThis.confirm('Chụp lại ảnh? Chọn Hủy để về Nhật ký.') ? 'camera' : 'journal')
      return
    }
    Alert.alert('Bỏ khoản chi này?', 'Ảnh và nội dung chưa lưu sẽ bị bỏ.', [
      { text: 'Bỏ và chụp lại', onPress: () => leave('camera') },
      { text: 'Bỏ và về Nhật ký', style: 'destructive', onPress: () => leave('journal') },
      { text: 'Ở lại', style: 'cancel' },
    ])
  }

  // Applies the typed time; an untouched field keeps the machine value and its provenance.
  const commitTimeInput = (): string | null => {
    if (timeInput === formatDateTimeInput(occurredAt)) return occurredAt
    const parsed = parseDateTimeInput(timeInput)
    if (parsed) suggestion.edit('occurredAt', parsed)
    return parsed
  }

  const save = async () => {
    if (!token || locked.current) return
    const amountMinor = parseCaptureAmount(amount)
    if (!amountMinor) {
      setError('Nhập số tiền lớn hơn 0, chỉ gồm các chữ số.')
      amountRef.current?.focus()
      return
    }
    const savedOccurredAt = commitTimeInput()
    if (!savedOccurredAt) {
      setError('Nhập thời gian theo dạng DD/MM/YYYY HH:mm.')
      return
    }
    Keyboard.dismiss()
    locked.current = true
    setSaving(true)
    setError(null)
    const suggestionFields = suggestion.savePayload()
    if (suggestionFields && selectedCategory !== draft.values.categoryId) {
      // The saved category is not the draft value (fallback or unknown id): no provenance for it.
      suggestionFields.fieldProvenance = { ...suggestionFields.fieldProvenance }
      delete suggestionFields.fieldProvenance.categoryId
    }
    const fingerprint = JSON.stringify({
      amountMinor,
      caption: caption.trim(),
      merchant: merchant.trim(),
      location: location.trim(),
      coordinates,
      selectedCategory,
      occurredAt: savedOccurredAt,
      imageUri,
    })
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = {
        fingerprint,
        key: `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      }
    try {
      if (imageUri && !uploadedMedia.current) {
        setSaveStage('Đang tải ảnh…')
        const image = await fetch(imageUri)
        if (!image.ok) throw new Error('Không đọc được ảnh. Hãy chọn hoặc chụp lại.')
        const blob = await image.blob()
        const mimeType = blob.type || 'image/jpeg'
        const media = await apiRequest<MediaReservation>('/media', {
          method: 'POST',
          token,
          body: { mimeType, sizeBytes: blob.size },
        })
        await apiRequest(media.uploadUrl, {
          method: 'PUT',
          token,
          headers: { 'Content-Type': mimeType },
          body: blob,
        })
        uploadedMedia.current = media.id
      }
      setSaveStage('Đang lưu chi tiêu…')
      const expense = await apiRequest<Expense>('/expenses', {
        method: 'POST',
        token,
        body: {
          amountMinor,
          currency: 'VND',
          occurredAt: savedOccurredAt,
          occurredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
          categoryId: selectedCategory,
          mediaAssetId: uploadedMedia.current,
          caption: caption.trim() || undefined,
          merchant: merchant.trim() || undefined,
          location: location.trim() || undefined,
          ...coordinates,
          ...suggestionFields,
          idempotencyKey: attempt.current.key,
        },
      })
      suggestion.finish()
      const photoBounds = await new Promise<PhotoBounds | undefined>((resolve) => {
        if (!photoRef.current || !imageUri) {
          resolve(undefined)
          return
        }
        photoRef.current.measureInWindow((x, y, width, height) =>
          resolve(width > 0 ? { x, y, width, height } : undefined),
        )
      })
      saveCapture(
        { expense, imageUri: source === 'shared' ? undefined : imageUri },
        source === 'shared' ? undefined : photoBounds,
      )
      if (sharedImageId) await completeSharedImage(sharedImageId)
      setExitTo('journal')
      setLeaving(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu. Hãy thử lại.')
      locked.current = false
      setSaving(false)
    }
  }

  const formatSuggestion = (field: SuggestionField, value: string) => {
    if (field === 'amountMinor') return formatMoney(value)
    if (field === 'categoryId') return categories?.find((item) => item.id === value)?.name ?? null
    if (field === 'occurredAt') return formatDateTime(value)
    return value
  }
  const fieldSuggestion = (field: SuggestionField): FieldSuggestion | null => {
    const chip = suggestion.suggestion(field)
    const value = chip ? formatSuggestion(field, chip.value) : null
    if (!chip || !value) return null
    return {
      value,
      source: chip.label,
      onPress: () => suggestion.apply(field, chip.candidateId),
    }
  }
  const amountSuggestion = fieldSuggestion('amountMinor')
  const pendingBarSuggestions = (field: SuggestionField): InputBarSuggestion[] =>
    suggestion.suggestions(field).flatMap((chip) => {
      const value = formatSuggestion(field, chip.value)
      return value
        ? [
            {
              key: chip.candidateId,
              value,
              source: chip.label,
              onPress: () => suggestion.apply(field, chip.candidateId),
            },
          ]
        : []
    })
  const amountBarSuggestions = (): InputBarSuggestion[] => {
    const pendingAmounts = suggestion.suggestions('amountMinor')
    const machineValues = [
      ...pendingAmounts.map((chip) => chip.value),
      ...(machineAmount ? [machineAmount.value] : []),
    ]
    return amountSuggestionValues(amount, machineValues).map((value) => {
      const pendingAmount = pendingAmounts.find((chip) => chip.value === value)
      return {
        key: value,
        value: formatMoney(value),
        source:
          pendingAmount?.label ?? (machineAmount?.value === value ? machineAmount.label : null),
        onPress: () =>
          pendingAmount
            ? suggestion.apply('amountMinor', pendingAmount.candidateId)
            : setAmount(value),
      }
    })
  }
  // Caption: the store name, typed or suggested, is usually a good title.
  const captionBarSuggestions = (): InputBarSuggestion[] => {
    const names = [merchant.trim(), ...suggestion.suggestions('merchant').map((chip) => chip.value)]
    return [...new Set(names)]
      .filter((name) => name && name !== caption.trim())
      .map((name) => ({
        key: `caption-${name}`,
        value: name,
        source: null,
        onPress: () => setCaption(name),
      }))
  }
  const locationBarSuggestions = (): InputBarSuggestion[] => [
    {
      key: 'current-location',
      value: 'Vị trí hiện tại',
      source: null,
      icon: 'navigation',
      busy: locating,
      onPress: () => void fillCurrentPlace().then(setError),
    },
  ]
  // Time: machine suggestions, then the moment the photo was taken or received, then now.
  const timeBarSuggestions = (): InputBarSuggestion[] => {
    const pending = pendingBarSuggestions('occurredAt')
    const captured = formatDateTime(draft.captureTime)
    const showCaptured =
      captured !== formatDateTime(occurredAt) && !pending.some((chip) => chip.value === captured)
    return [
      ...pending,
      ...(showCaptured
        ? [
            {
              key: 'capture-time',
              value: captured,
              source: source === 'shared' ? 'Giờ nhận ảnh' : 'Giờ chụp ảnh',
              icon: 'clock' as const,
              onPress: () => suggestion.edit('occurredAt', draft.captureTime),
            },
          ]
        : []),
      {
        key: 'now',
        value: 'Bây giờ',
        source: null,
        icon: 'clock' as const,
        onPress: () => suggestion.edit('occurredAt', new Date().toISOString()),
      },
    ]
  }
  const inputBarSuggestions =
    activeField === 'amount'
      ? amountBarSuggestions()
      : activeField === 'caption'
        ? captionBarSuggestions()
        : activeField === 'merchant'
          ? pendingBarSuggestions('merchant')
          : activeField === 'location'
            ? locationBarSuggestions()
            : activeField === 'time'
              ? timeBarSuggestions()
              : []
  const categorySuggestion = fieldSuggestion('categoryId')

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar style="dark" />
      <ExpenseFormHeader
        closeLabel="Tùy chọn thoát"
        onClose={openCloseMenu}
        onSave={() => void save()}
        saveLabel="Lưu chi tiêu"
        saving={saving}
        savingLabel={saveStage}
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
            <View ref={heroBlock} collapsable={false} style={styles.hero}>
              <View ref={photoRef} collapsable={false} style={styles.photo}>
                {imageUri ? (
                  <Image
                    accessibilityLabel="Ảnh vừa chụp"
                    resizeMode="cover"
                    onLoadEnd={() => requestAnimationFrame(beginSuggestion)}
                    source={{ uri: imageUri }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <PhotoExpenseEditor
                  amount={amount}
                  amountRef={amountRef}
                  caption={caption}
                  captionPlaceholder={merchant.trim() || 'Thêm tiêu đề'}
                  captionRef={captionRef}
                  category={selectedCategoryItem}
                  disabled={saving}
                  onAmountChange={(value) => {
                    setAmount(value)
                    setError(null)
                  }}
                  onBlur={(field) => fieldBlurred(field, heroBlock.current)}
                  onCaptionChange={setCaption}
                  onFocus={(field) => fieldFocused(field, heroBlock.current)}
                  onCategoryPress={() => {
                    Keyboard.dismiss()
                    focused(categoriesBlock.current)
                  }}
                />
              </View>
              {suggestion.pending && !keyboardVisible ? <SuggestionPending /> : null}
              {amountSource ? <SourceBadge label={`Số tiền · ${amountSource}`} /> : null}
              {amountSuggestion && activeField !== 'amount' ? (
                <View style={styles.heroChip}>
                  <SuggestionChip disabled={saving} field="Số tiền" suggestion={amountSuggestion} />
                </View>
              ) : null}
            </View>
            <View ref={categoriesBlock} collapsable={false} style={styles.categories}>
              {categorySource ? (
                <View style={styles.labelRow}>
                  <SourceBadge label={categorySource} />
                </View>
              ) : null}
              <CategoryPicker
                categories={categories ?? []}
                disabled={saving}
                onCreated={(category) => {
                  setCategories((current) => (current ? [...current, category] : [category]))
                  selectCategory(category.id)
                }}
                onSelect={selectCategory}
                selectedId={selectedCategory}
              />
              {categorySuggestion ? (
                <SuggestionChip
                  disabled={saving}
                  field="Danh mục"
                  suggestion={categorySuggestion}
                />
              ) : null}
              {categoryError ? (
                <AnimatedPressable accessibilityRole="button" onPress={() => void refresh()}>
                  <Text style={styles.helper}>Chưa tải được danh mục · Thử lại</Text>
                </AnimatedPressable>
              ) : null}
            </View>
            <View style={styles.details}>
              <ExpenseDetailRow
                disabled={saving}
                icon="shopping-bag"
                label="Cửa hàng"
                onPress={() => merchantRef.current?.focus()}
                ref={merchantBlock}
                source={suggestion.sourceLabel('merchant')}
                suggestion={activeField === 'merchant' ? null : fieldSuggestion('merchant')}
              >
                <TextInput
                  ref={merchantRef}
                  accessibilityLabel="Tên cửa hàng"
                  editable={!saving}
                  maxLength={160}
                  onBlur={() => fieldBlurred('merchant', merchantBlock.current)}
                  onChangeText={(value) => suggestion.edit('merchant', value)}
                  onFocus={() => fieldFocused('merchant', merchantBlock.current)}
                  placeholder="Thêm cửa hàng"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.detailInput}
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
                  style={styles.detailInput}
                  value={location}
                />
              </ExpenseDetailRow>
              <ExpenseDetailRow
                action={
                  occurredFromReceipt
                    ? {
                        label: source === 'shared' ? 'Dùng giờ nhận ảnh' : 'Dùng giờ chụp ảnh',
                        onPress: () => suggestion.edit('occurredAt', draft.captureTime),
                      }
                    : undefined
                }
                disabled={saving}
                icon="clock"
                label="Thời gian"
                onPress={() => timeRef.current?.focus()}
                ref={timeBlock}
                source={suggestion.sourceLabel('occurredAt')}
                suggestion={activeField === 'time' ? null : fieldSuggestion('occurredAt')}
              >
                <TextInput
                  ref={timeRef}
                  accessibilityHint="Nhập theo dạng ngày tháng năm, giờ phút"
                  accessibilityLabel="Thời gian chi tiêu"
                  editable={!saving}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  onBlur={() => {
                    fieldBlurred('time', timeBlock.current)
                    if (!commitTimeInput()) {
                      setError('Nhập thời gian theo dạng DD/MM/YYYY HH:mm.')
                      setTimeEditor({ source: occurredAt, value: formatDateTimeInput(occurredAt) })
                    }
                  }}
                  onChangeText={(value) => setTimeEditor({ source: occurredAt, value })}
                  onFocus={() => fieldFocused('time', timeBlock.current)}
                  placeholder="DD/MM/YYYY HH:mm"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  style={styles.detailInput}
                  value={timeInput}
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
            field={activeField ? inputBarFieldNames[activeField] : 'Khoản chi'}
            pending={suggestion.pending}
            suggestions={inputBarSuggestions}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  hero: { alignItems: 'center', gap: 10 },
  heroChip: { flexDirection: 'row', justifyContent: 'center', maxWidth: '100%' },
  photo: {
    aspectRatio: expensePhotoAspectRatio,
    width: '100%',
    backgroundColor: colors.camera,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  helper: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  categories: { paddingHorizontal: 4, gap: 12 },
  labelRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  details: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 20,
    marginTop: -1,
    overflow: 'hidden',
  },
  detailInput: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    minHeight: 24,
    padding: 0,
  },
  locate: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  error: {
    color: '#B3433C',
    fontFamily: fonts.medium,
    fontSize: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
})

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
