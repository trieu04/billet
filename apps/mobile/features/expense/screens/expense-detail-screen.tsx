import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthenticatedImage } from '@/features/api/authenticated-image'
import { apiRequest } from '@/features/api/client'
import { formatMoney } from '@/features/api/format'
import type { Category, Expense } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { Receipt } from '@/features/expense/components/receipt'
import { AnimatedPressable, useEntranceAnimation, useReducedMotion } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

const useNativeDriver = Platform.OS !== 'web'

export function ExpenseDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const { token } = useSession()
  const load = useCallback(
    async (accessToken: string) => {
      if (!params.id) throw new Error('Thiếu mã khoản chi')
      const [expense, categories] = await Promise.all([
        apiRequest<Expense>(`/expenses/${params.id}`, { token: accessToken }),
        apiRequest<Category[]>('/categories', { token: accessToken }),
      ])
      return { expense, categories }
    },
    [params.id],
  )
  const { data, error, loading, setData } = useApiResource(load)
  const [expanded, setExpanded] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const reducedMotion = useReducedMotion()
  const [sheetProgress] = useState(() => new Animated.Value(0))
  const screenEntrance = useEntranceAnimation(20, 8)
  const expense = data?.expense
  const categories = data?.categories ?? []
  const displayedCategoryId = categoryId ?? expense?.categoryId ?? ''
  const displayedCategory = categories.find((item) => item.id === displayedCategoryId)

  useEffect(() => {
    if (!expanded) return
    if (reducedMotion) {
      sheetProgress.setValue(1)
      return
    }
    Animated.spring(sheetProgress, {
      toValue: 1,
      damping: 24,
      stiffness: 250,
      mass: 0.8,
      useNativeDriver,
    }).start()
  }, [expanded, reducedMotion, sheetProgress])

  const openSheet = () => {
    sheetProgress.setValue(reducedMotion ? 1 : 0)
    setExpanded(true)
  }

  const closeSheet = () => {
    if (reducedMotion) {
      setExpanded(false)
      return
    }
    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: 210,
      useNativeDriver,
    }).start(({ finished }) => {
      if (finished) setExpanded(false)
    })
  }

  const save = async () => {
    if (!token || !expense) return
    setSaving(true)
    try {
      const updated = await apiRequest<Expense>(`/expenses/${expense.id}`, {
        method: 'PATCH',
        token,
        body: {
          version: expense.version,
          caption: expense.caption,
          categoryId: displayedCategoryId,
        },
      })
      setData({ expense: updated, categories })
      setCategoryId(null)
      closeSheet()
    } catch (reason) {
      Alert.alert(
        'Không thể lưu thay đổi',
        reason instanceof Error ? reason.message : 'Hãy thử lại.',
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = () =>
    Alert.alert('Xóa khoản chi?', 'Khoản chi này sẽ bị xóa khỏi Journal.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          if (!token || !expense) return
          void apiRequest(`/expenses/${expense.id}`, { method: 'DELETE', token })
            .then(() => router.replace('/'))
            .catch((reason: unknown) =>
              Alert.alert(
                'Không thể xóa',
                reason instanceof Error ? reason.message : 'Hãy thử lại.',
              ),
            )
        },
      },
    ])

  const cycleCategory = () => {
    if (!categories.length) return
    const currentIndex = categories.findIndex((item) => item.id === displayedCategoryId)
    setCategoryId(
      categories[(currentIndex + 1) % categories.length]?.id ?? categories[0]?.id ?? null,
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.link} />
        <Text style={styles.loadingText}>Đang mở khoảnh khắc…</Text>
      </SafeAreaView>
    )
  }

  if (error || !expense) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? 'Không tìm thấy khoản chi'}</Text>
        <AnimatedPressable onPress={() => router.back()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Quay lại Journal</Text>
        </AnimatedPressable>
      </SafeAreaView>
    )
  }

  const timestamp = formatTimestamp(new Date(expense.occurredAt))

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <Animated.View style={[styles.screen, screenEntrance]}>
        <View style={styles.nav}>
          <AnimatedPressable
            accessibilityLabel="Quay lại Journal"
            onPress={() => router.back()}
            pressedScale={0.94}
            style={styles.back}
          >
            <Text style={styles.backGlyph}>‹</Text>
            <Text style={styles.navAction}>Journal</Text>
          </AnimatedPressable>
          <Text style={styles.navTitle}>Chi tiết</Text>
          <AnimatedPressable
            accessibilityHint="Nhấn giữ để xóa khoản chi"
            accessibilityRole="button"
            onLongPress={remove}
            onPress={openSheet}
            pressedScale={0.94}
            style={styles.editButton}
          >
            <Text style={[styles.navAction, styles.editText]}>Sửa</Text>
          </AnimatedPressable>
        </View>

        <Photo expense={expense} timestamp={timestamp} token={token} />

        <View style={styles.captionCard}>
          <Text style={styles.fieldLabel}>Hôm nay có gì đáng nhớ?</Text>
          <Text numberOfLines={2} style={styles.captionValue}>
            {expense.caption || 'Một khoảnh khắc trong ngày.'}
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.fieldLabel}>Số tiền</Text>
          <Text style={styles.amount}>{formatMoney(expense.amountMinor, expense.currency)}</Text>
          <Text style={styles.amountTime}>{timestamp}</Text>
        </View>

        <View style={styles.metadataCard}>
          <View style={styles.categoryChip}>
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: displayedCategory?.color || '#FFFFFF' },
              ]}
            />
            <Text numberOfLines={1} style={styles.categoryText}>
              {displayedCategory?.name || 'Khác'}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.merchant}>
            {expense.merchant || 'Chưa thêm cửa hàng'}
          </Text>
        </View>

        <AnimatedPressable accessibilityRole="button" onPress={openSheet} style={styles.moreButton}>
          <Text style={styles.moreText}>Thông tin khác</Text>
          <Feather color="#8C847B" name="chevron-right" size={18} />
        </AnimatedPressable>
      </Animated.View>

      {expanded ? (
        <View accessibilityViewIsModal style={StyleSheet.absoluteFill}>
          <AnimatedPressable
            accessibilityLabel="Đóng thông tin khác"
            onPress={closeSheet}
            style={[
              styles.scrim,
              {
                opacity: sheetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.22],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: sheetProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [514, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Thông tin khác</Text>
            <AnimatedPressable onPress={closeSheet} style={styles.doneButton}>
              <Text style={styles.doneText}>Xong</Text>
            </AnimatedPressable>

            <SheetField label="Danh mục" onPress={cycleCategory} top={76}>
              <View style={styles.sheetCategory}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: displayedCategory?.color || '#FFFFFF' },
                  ]}
                />
                <Text style={styles.sheetCategoryText}>{displayedCategory?.name || 'Khác'}</Text>
              </View>
            </SheetField>
            <SheetField
              label="Cửa hàng"
              onPress={() => Alert.alert('Cửa hàng', expense.merchant || 'Chưa thêm cửa hàng')}
              top={156}
              value={expense.merchant || 'Thêm cửa hàng'}
            />
            <SheetField label="Ngày & giờ" onPress={() => undefined} top={236} value={timestamp} />
            <SheetField
              label="Địa điểm"
              onPress={() => Alert.alert('Địa điểm', expense.location || 'Chưa thêm địa điểm')}
              placeholder={!expense.location}
              top={316}
              value={expense.location || 'Thêm địa điểm'}
            />

            <AnimatedPressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void save()}
              pressedScale={0.98}
              style={styles.saveButton}
            >
              {saving ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.saveText}>Lưu</Text>
              )}
            </AnimatedPressable>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function Photo({
  expense,
  timestamp,
  token,
}: {
  expense: Expense
  timestamp: string
  token: string | null
}) {
  return (
    <View style={styles.photo}>
      {expense.mediaAssetId && token ? (
        <AuthenticatedImage
          accessibilityLabel="Ảnh khoản chi"
          fallback={<PhotoFallback />}
          mediaAssetId={expense.mediaAssetId}
          resizeMode="cover"
          style={styles.photoImage}
          token={token}
        />
      ) : (
        <PhotoFallback />
      )}
      <View style={styles.photoTimestamp}>
        <Text style={styles.photoTimestampText}>{timestamp}</Text>
      </View>
    </View>
  )
}

function PhotoFallback() {
  return (
    <LinearGradient
      colors={[colors.sage, colors.butter]}
      end={{ x: 1, y: 1 }}
      style={styles.photoImage}
    >
      <Receipt height={210} rotation="3deg" width={150} />
    </LinearGradient>
  )
}

function SheetField({
  children,
  label,
  onPress,
  placeholder = false,
  top,
  value,
}: {
  children?: React.ReactNode
  label: string
  onPress: () => void
  placeholder?: boolean
  top: number
  value?: string
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.sheetField, { top }]}
    >
      <Text style={styles.sheetFieldLabel}>{label}</Text>
      {children ?? (
        <Text numberOfLines={1} style={[styles.sheetFieldValue, placeholder && styles.placeholder]}>
          {value}
        </Text>
      )}
      <Feather color="#8C847B" name="chevron-right" size={18} style={styles.sheetChevron} />
    </AnimatedPressable>
  )
}

function formatTimestamp(value: Date) {
  const today = new Date()
  const sameDay = value.toDateString() === today.toDateString()
  const day = sameDay ? 'Hôm nay' : value.toLocaleDateString('vi-VN')
  const time = value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 30,
    left: 18,
    letterSpacing: -0.5,
    position: 'absolute',
    top: 34,
  },
  amountCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 94,
    marginHorizontal: 16,
    marginTop: 12,
    position: 'relative',
  },
  amountTime: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    position: 'absolute',
    right: 18,
    top: 42,
  },
  back: { alignItems: 'center', flexDirection: 'row', height: 40, width: 112 },
  backGlyph: { color: colors.link, fontFamily: fonts.regular, fontSize: 22, marginRight: 5 },
  captionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 92,
    marginHorizontal: 16,
    marginTop: 16,
    position: 'relative',
  },
  captionValue: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 17,
    left: 18,
    lineHeight: 22,
    position: 'absolute',
    right: 18,
    top: 40,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.sage,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 6,
    height: 34,
    maxWidth: 128,
    paddingHorizontal: 12,
  },
  categoryDot: { borderRadius: 4, height: 8, width: 8 },
  categoryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  center: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  doneButton: { position: 'absolute', right: 20, top: 31 },
  doneText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 16 },
  editButton: { alignItems: 'flex-end', height: 40, justifyContent: 'center', width: 80 },
  editText: { fontFamily: fonts.semibold },
  error: {
    color: '#B3433C',
    fontFamily: fonts.medium,
    fontSize: 15,
    marginHorizontal: 24,
    textAlign: 'center',
  },
  errorButton: { paddingHorizontal: 20, paddingVertical: 12 },
  errorButtonText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 15 },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    left: 18,
    position: 'absolute',
    top: 14,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: '#DDD5C9',
    borderRadius: 3,
    height: 5,
    marginTop: 9,
    width: 36,
  },
  loadingText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  merchant: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    marginLeft: 16,
    textAlign: 'right',
  },
  metadataCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    flexDirection: 'row',
    height: 54,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  moreButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 18,
  },
  moreText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 52,
  },
  navAction: { color: colors.link, fontFamily: fonts.regular, fontSize: 17 },
  navTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  photo: {
    borderRadius: 30,
    height: 280,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  photoTimestamp: {
    backgroundColor: colors.card,
    borderRadius: 14,
    bottom: 14,
    height: 28,
    justifyContent: 'center',
    left: 14,
    paddingHorizontal: 12,
    position: 'absolute',
  },
  photoTimestampText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  placeholder: { color: '#A89E93' },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 27,
    bottom: 48,
    height: 54,
    justifyContent: 'center',
    left: 16,
    position: 'absolute',
    right: 16,
  },
  saveText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  screen: { flex: 1 },
  scrim: {
    backgroundColor: colors.camera,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    height: 514,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  sheetCategory: {
    alignItems: 'center',
    backgroundColor: colors.sage,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 6,
    height: 30,
    left: 15,
    paddingHorizontal: 11,
    position: 'absolute',
    top: 31,
  },
  sheetCategoryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  sheetChevron: { position: 'absolute', right: 14, top: 27 },
  sheetField: {
    borderColor: '#F0EADF',
    borderRadius: 16,
    borderWidth: 1,
    height: 72,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  sheetFieldLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    left: 15,
    position: 'absolute',
    top: 10,
  },
  sheetFieldValue: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    left: 15,
    position: 'absolute',
    right: 42,
    top: 32,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    left: 20,
    position: 'absolute',
    top: 34,
  },
})
