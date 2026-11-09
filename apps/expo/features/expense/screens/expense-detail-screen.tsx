import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthenticatedImage } from '@/features/api/authenticated-image'
import { apiRequest } from '@/features/api/client'
import { formatMoney } from '@/features/api/format'
import type { Category, Expense } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { useCaptureFlow } from '@/features/expense/capture-flow'
import { ExpenseDetailRow } from '@/features/expense/components/expense-detail-row'
import {
  ExpenseEditForm,
  type ExpenseEditField,
} from '@/features/expense/components/expense-edit-form'
import { PhotoExpenseOverlay } from '@/features/expense/components/photo-expense-overlay'
import { Receipt } from '@/features/expense/components/receipt'
import { StackHeader } from '@/features/ui/blur-header'
import { headerHeight } from '@/features/ui/header-metrics'
import { AnimatedPressable, useEntranceAnimation } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'

export function ExpenseDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const { token } = useSession()
  const insets = useSafeAreaInsets()
  const { removeCapture } = useCaptureFlow()
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
  const [editing, setEditing] = useState<{ field?: ExpenseEditField } | null>(null)
  const screenEntrance = useEntranceAnimation(20, 8)
  const expense = data?.expense
  const categories = data?.categories ?? []

  const remove = () =>
    Alert.alert('Xóa khoản chi?', 'Khoản chi này sẽ bị xóa khỏi Journal.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          if (!token || !expense) return
          void apiRequest(`/expenses/${expense.id}`, { method: 'DELETE', token })
            .then(() => {
              removeCapture(expense.id)
              router.replace('/')
            })
            .catch((reason: unknown) =>
              Alert.alert(
                'Không thể xóa',
                reason instanceof Error ? reason.message : 'Hãy thử lại.',
              ),
            )
        },
      },
    ])

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

  if (editing && token) {
    return (
      <ExpenseEditForm
        categories={categories}
        expense={expense}
        initialField={editing.field}
        onCancel={() => setEditing(null)}
        onCategoryCreated={(category) =>
          setData({ expense, categories: [...categories, category] })
        }
        onSaved={(updated) => {
          setData({ expense: updated, categories })
          setEditing(null)
        }}
        photo={<PhotoMedia expense={expense} token={token} />}
        token={token}
      />
    )
  }

  const edit = (field?: ExpenseEditField) => setEditing({ field })

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <StackHeader>
        <AnimatedPressable
          accessibilityLabel="Quay lại Journal"
          onPress={() => router.back()}
          pressedScale={0.94}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
          <Text style={styles.navAction}>Journal</Text>
        </AnimatedPressable>
        <Text accessibilityRole="header" style={styles.navTitle}>
          Chi tiết
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => edit()}
          pressedScale={0.94}
          style={styles.editButton}
        >
          <Text style={[styles.navAction, styles.editText]}>Sửa</Text>
        </AnimatedPressable>
      </StackHeader>
      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingTop: headerHeight(insets.top),
        }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={[styles.screen, screenEntrance]}
      >
        <View style={styles.photoFrame}>
          <View style={styles.photo}>
            <PhotoMedia expense={expense} token={token} />
            <PhotoExpenseOverlay
              amount={formatMoney(expense.amountMinor, expense.currency)}
              category={categories.find((item) => item.id === expense.categoryId)}
              title={expense.caption || expense.merchant || 'Khoản chi'}
            />
          </View>
        </View>

        <View style={styles.details}>
          <ExpenseDetailRow icon="clock" label="Thời gian" onPress={() => edit('time')}>
            <Text numberOfLines={1} style={styles.value}>
              {formatTimestamp(new Date(expense.occurredAt))}
            </Text>
          </ExpenseDetailRow>
          <ExpenseDetailRow icon="shopping-bag" label="Cửa hàng" onPress={() => edit('merchant')}>
            <Text numberOfLines={1} style={expense.merchant ? styles.value : styles.placeholder}>
              {expense.merchant || 'Thêm cửa hàng'}
            </Text>
          </ExpenseDetailRow>
          <ExpenseDetailRow icon="map-pin" label="Địa điểm" onPress={() => edit('location')}>
            <Text numberOfLines={2} style={expense.location ? styles.value : styles.placeholder}>
              {expense.location || 'Thêm địa điểm'}
            </Text>
          </ExpenseDetailRow>
        </View>

        <AnimatedPressable accessibilityRole="button" onPress={remove} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Xóa khoản chi</Text>
        </AnimatedPressable>
      </Animated.ScrollView>
    </SafeAreaView>
  )
}

function PhotoMedia({ expense, token }: { expense: Expense; token: string | null }) {
  if (!expense.mediaAssetId || !token) return <PhotoFallback />
  return (
    <AuthenticatedImage
      accessibilityLabel="Ảnh khoản chi"
      fallback={<PhotoFallback />}
      mediaAssetId={expense.mediaAssetId}
      resizeMode="cover"
      style={styles.photoImage}
      token={token}
    />
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

function formatTimestamp(value: Date) {
  const today = new Date()
  const sameDay = value.toDateString() === today.toDateString()
  const day = sameDay ? 'Hôm nay' : value.toLocaleDateString('vi-VN')
  const time = value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', flexDirection: 'row', height: 44, width: 112 },
  backGlyph: {
    color: colors.link,
    fontFamily: fonts.regular,
    fontSize: 22,
    marginRight: 5,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  deleteText: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 15 },
  details: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  editButton: { alignItems: 'flex-end', height: 44, justifyContent: 'center', width: 80 },
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
  loadingText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  navAction: { color: colors.link, fontFamily: fonts.regular, fontSize: 17 },
  navTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  photo: {
    aspectRatio: expensePhotoAspectRatio,
    borderCurve: 'continuous',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  photoFrame: { paddingHorizontal: 16 },
  photoImage: { alignItems: 'center', height: '100%', justifyContent: 'center', width: '100%' },
  placeholder: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 16 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  screen: { flex: 1 },
  value: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
})
