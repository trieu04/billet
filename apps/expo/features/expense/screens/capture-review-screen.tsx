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
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
  type ViewInstance,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney } from '@/features/api/format'
import type { Category, Expense, MediaReservation } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { useCaptureFlow } from '../capture-flow'
import { parseCaptureAmount, type PhotoBounds } from '../capture-model'
import { PhotoExpenseOverlay } from '../components/photo-expense-overlay'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'

export function CaptureReviewScreen() {
  const { imageUri, capturedAt } = useLocalSearchParams<{
    imageUri?: string
    capturedAt?: string
  }>()
  const { token } = useSession()
  const { saveCapture } = useCaptureFlow()
  const insets = useSafeAreaInsets()
  const loadCategories = useCallback(
    (accessToken: string) => apiRequest<Category[]>('/categories', { token: accessToken }),
    [],
  )
  const { data: categories, error: categoryError, refresh } = useApiResource(loadCategories)
  const [caption, setCaption] = useState('')
  const [editingField, setEditingField] = useState<'amount' | 'title' | null>(null)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [exitTo, setExitTo] = useState<'camera' | 'journal'>('journal')
  const [error, setError] = useState<string | null>(null)
  const [saveStage, setSaveStage] = useState('Đang lưu…')
  const locked = useRef(false)
  const captionRef = useRef<TextInputInstance>(null)
  const amountRef = useRef<TextInputInstance>(null)
  const photoRef = useRef<ViewInstance>(null)
  const reviewScrollRef = useRef<ScrollViewInstance>(null)
  const uploadedMedia = useRef<string | undefined>(undefined)
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const [occurredAt] = useState(() =>
    capturedAt && Number.isFinite(Date.parse(capturedAt)) ? capturedAt : new Date().toISOString(),
  )
  const selectedCategory = categoryId ?? categories?.[0]?.id
  const dirty = Boolean(imageUri || amount || caption || categoryId)
  const timeLabel = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(occurredAt))
  const amountPreview = formatMoney(parseCaptureAmount(amount) ?? '0')

  useEffect(() => {
    if (!editingField) return
    const frame = requestAnimationFrame(() => {
      if (editingField === 'title') captionRef.current?.focus()
      else amountRef.current?.focus()
      reviewScrollRef.current?.scrollTo({ y: 0, animated: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [editingField])

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

  usePreventRemove(!leaving && (dirty || saving), () => {
    if (!locked.current) {
      setExitTo('camera')
      confirmDiscard(() => setLeaving(true))
    }
  })

  // Removal is retried only after the guard has rendered with leaving=true.
  const finishLeaving = useCallback(() => {
    if (!leaving) return
    if (exitTo === 'camera') {
      router.dismissTo('/capture')
    } else router.dismissTo('/')
  }, [exitTo, leaving])

  useEffect(finishLeaving, [finishLeaving])

  const leave = (destination: 'camera' | 'journal') => {
    if (locked.current) return
    setExitTo(destination)
    if (dirty) confirmDiscard(() => setLeaving(true))
    else setLeaving(true)
  }

  const save = async () => {
    if (!token || locked.current) return
    const amountMinor = parseCaptureAmount(amount)
    if (!amountMinor) {
      setError('Nhập số tiền lớn hơn 0, chỉ gồm các chữ số.')
      return
    }
    Keyboard.dismiss()
    locked.current = true
    setSaving(true)
    setError(null)
    const fingerprint = JSON.stringify({
      amountMinor,
      caption: caption.trim(),
      selectedCategory,
      occurredAt,
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
          occurredAt,
          occurredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
          categoryId: selectedCategory,
          mediaAssetId: uploadedMedia.current,
          caption: caption.trim() || undefined,
          idempotencyKey: attempt.current.key,
        },
      })
      const source = await new Promise<PhotoBounds | undefined>((resolve) => {
        if (!photoRef.current || !imageUri) {
          resolve(undefined)
          return
        }
        photoRef.current.measureInWindow((x, y, width, height) =>
          resolve(width > 0 ? { x, y, width, height } : undefined),
        )
      })
      saveCapture({ expense, imageUri }, source)
      setExitTo('journal')
      setLeaving(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu. Hãy thử lại.')
      locked.current = false
      setSaving(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Hủy chỉnh sửa"
          accessibilityRole="button"
          disabled={saving}
          onPress={() => leave('journal')}
          style={styles.iconButton}
        >
          <Feather color={colors.text} name="x" size={22} />
        </AnimatedPressable>
        <Text style={styles.title}>Chỉnh sửa chi tiêu</Text>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => leave('camera')}
          style={styles.retake}
        >
          <Text style={styles.retakeText}>{imageUri ? 'Chụp lại' : 'Chụp ảnh'}</Text>
        </AnimatedPressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.body}
      >
        <ScrollView
          ref={reviewScrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {imageUri ? (
            <View ref={photoRef} collapsable={false} style={styles.photo}>
              <Image
                accessibilityLabel="Ảnh vừa chụp"
                resizeMode="cover"
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
              />
              <PhotoExpenseOverlay
                amount={amountPreview}
                amountEditor={
                  editingField === 'amount' ? (
                    <View style={styles.overlayAmountEditor}>
                      <TextInput
                        ref={amountRef}
                        accessibilityLabel="Số tiền chi tiêu"
                        editable={!saving}
                        keyboardType="number-pad"
                        maxLength={15}
                        onBlur={() => setEditingField(null)}
                        onChangeText={(value) => {
                          setAmount(value)
                          setError(null)
                        }}
                        onSubmitEditing={() => {
                          setEditingField(null)
                          Keyboard.dismiss()
                        }}
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.72)"
                        returnKeyType="done"
                        selectTextOnFocus
                        style={[
                          styles.overlayAmountInput,
                          { width: Math.min(150, Math.max(48, amount.length * 13)) },
                        ]}
                        value={amount}
                      />
                      <Text style={styles.overlayCurrency}>₫</Text>
                    </View>
                  ) : undefined
                }
                meta={timeLabel}
                onAmountPress={saving ? undefined : () => setEditingField('amount')}
                onTitlePress={saving ? undefined : () => setEditingField('title')}
                title={caption || 'Thêm tiêu đề'}
                titleEditor={
                  editingField === 'title' ? (
                    <TextInput
                      ref={captionRef}
                      accessibilityLabel="Tiêu đề khoản chi"
                      editable={!saving}
                      maxLength={120}
                      onBlur={() => setEditingField(null)}
                      onChangeText={setCaption}
                      onSubmitEditing={() => {
                        setEditingField(null)
                        Keyboard.dismiss()
                      }}
                      placeholder="Thêm tiêu đề"
                      placeholderTextColor="rgba(255,255,255,0.72)"
                      returnKeyType="done"
                      selectTextOnFocus
                      style={styles.overlayTitleInput}
                      value={caption}
                    />
                  ) : undefined
                }
              />
            </View>
          ) : null}
          {!imageUri ? (
            <View style={styles.card}>
              <Text style={styles.label}>SỐ TIỀN</Text>
              <View style={styles.amountRow}>
                <TextInput
                  ref={amountRef}
                  accessibilityLabel="Số tiền chi tiêu"
                  editable={!saving}
                  keyboardType="number-pad"
                  maxLength={15}
                  onChangeText={(value) => {
                    setAmount(value)
                    setError(null)
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  style={styles.amountInput}
                  value={amount}
                />
                <Text style={styles.currency}>₫</Text>
              </View>
              <Text style={styles.helper}>Nhập số tiền của khoảnh khắc này</Text>
            </View>
          ) : null}
          <View style={styles.categories}>
            <Text style={styles.label}>DANH MỤC</Text>
            <View style={styles.chips}>
              {categories?.map((category) => (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === category.id }}
                  disabled={saving}
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.chip, selectedCategory === category.id && styles.selectedChip]}
                >
                  <Text style={styles.chipText}>{category.name}</Text>
                  {selectedCategory === category.id ? (
                    <Feather name="check" size={14} color={colors.link} />
                  ) : null}
                </AnimatedPressable>
              ))}
            </View>
            {categoryError ? (
              <AnimatedPressable accessibilityRole="button" onPress={() => void refresh()}>
                <Text style={styles.helper}>Chưa tải được danh mục · Thử lại</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(12, 16 - insets.bottom) }]}>
          {error ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <AnimatedPressable
            accessibilityLabel={saving ? saveStage : 'Lưu chi tiêu'}
            accessibilityRole="button"
            accessibilityState={{ busy: saving, disabled: saving }}
            disabled={saving}
            onPress={() => void save()}
            style={styles.primary}
          >
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Feather name="check" color={colors.text} size={20} />
            )}
            <Text style={styles.primaryText}>{saving ? saveStage : 'Lưu chi tiêu'}</Text>
          </AnimatedPressable>
          <Text style={styles.footerHint}>Lưu khoảnh khắc vào dòng thời gian của bạn</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.card,
  },
  title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  retake: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  retakeText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  photo: {
    aspectRatio: expensePhotoAspectRatio,
    width: '100%',
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    padding: 0,
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
  },
  currency: { color: colors.textSecondary, fontFamily: fonts.amount, fontSize: 28 },
  helper: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  overlayAmountEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 44,
  },
  overlayAmountInput: {
    color: 'white',
    fontFamily: fonts.amount,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    padding: 0,
    textAlign: 'right',
  },
  overlayCurrency: { color: 'white', fontFamily: fonts.amount, fontSize: 20 },
  overlayTitleInput: {
    color: 'white',
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 19,
    minHeight: 24,
    padding: 0,
  },
  categories: { padding: 4, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedChip: { backgroundColor: colors.peachSoft },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  error: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 14, padding: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 8, backgroundColor: colors.canvas },
  primary: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.peach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  footerHint: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
})
