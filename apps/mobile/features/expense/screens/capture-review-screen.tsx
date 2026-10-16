import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { type Href, router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney } from '@/features/api/format'
import type { Category, Expense, MediaReservation } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { Receipt } from '@/features/expense/components/receipt'
import { AnimatedPressable, useEntranceAnimation } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

const defaultTimestamp = formatTimestamp(new Date())

export function CaptureReviewScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>()
  const { token } = useSession()
  const loadCategories = useCallback(
    (accessToken: string) => apiRequest<Category[]>('/categories', { token: accessToken }),
    [],
  )
  const { data: categories } = useApiResource(loadCategories)
  const [caption, setCaption] = useState('')
  const [amount, setAmount] = useState('58000')
  const [editingAmount, setEditingAmount] = useState(false)
  const [saving, setSaving] = useState(false)
  const photoEntrance = useEntranceAnimation(30, 8)
  const formEntrance = useEntranceAnimation(100, 12)

  const save = async () => {
    if (!token) return
    const amountMinor = amount.replace(/\D/g, '')
    if (!amountMinor || amountMinor === '0') {
      Alert.alert('Số tiền chưa hợp lệ', 'Nhập số tiền lớn hơn 0.')
      return
    }

    setSaving(true)
    try {
      let mediaAssetId: string | undefined
      if (imageUri) {
        const image = await fetch(imageUri)
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
        mediaAssetId = media.id
      }

      const expense = await apiRequest<Expense>('/expenses', {
        method: 'POST',
        token,
        body: {
          amountMinor,
          currency: 'VND',
          occurredAt: new Date().toISOString(),
          occurredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
          categoryId: categories?.[0]?.id,
          mediaAssetId,
          caption: caption.trim() || undefined,
          idempotencyKey: `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
      })
      router.replace({ pathname: '/expense', params: { id: expense.id } } as Href)
    } catch (reason) {
      Alert.alert(
        'Không thể lưu khoản chi',
        reason instanceof Error ? reason.message : 'Hãy thử lại.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Đóng"
          onPress={() => router.back()}
          pressedScale={0.9}
          style={styles.close}
        >
          <Feather color="white" name="x" size={22} />
        </AnimatedPressable>
        <Text style={styles.title}>Sau khi chụp</Text>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => router.replace('/capture')}
          pressedScale={0.94}
          style={styles.retakeButton}
        >
          <Text style={styles.retake}>Chụp lại</Text>
        </AnimatedPressable>
      </View>

      <Animated.View style={[styles.photo, photoEntrance]}>
        {imageUri ? (
          <Image
            accessibilityLabel="Ảnh hóa đơn vừa chụp"
            source={{ uri: imageUri }}
            style={styles.image}
          />
        ) : (
          <LinearGradient
            colors={[colors.sage, colors.butter]}
            end={{ x: 1, y: 1 }}
            style={styles.photoFallback}
          >
            <Receipt height={202} rotation="3deg" width={140} />
          </LinearGradient>
        )}
        <View style={styles.timestamp}>
          <Text style={styles.timestampText}>{defaultTimestamp}</Text>
        </View>
      </Animated.View>

      <Animated.View style={formEntrance}>
        <View style={styles.captionCard}>
          <Text style={styles.fieldTitle}>Hôm nay có gì đáng nhớ?</Text>
          <TextInput
            accessibilityLabel="Caption"
            multiline
            onChangeText={setCaption}
            placeholder="Thêm caption…"
            placeholderTextColor="#A89E93"
            style={styles.captionInput}
            value={caption}
          />
        </View>

        <AnimatedPressable
          accessibilityHint="Mở bàn phím để sửa số tiền"
          accessibilityRole="button"
          onPress={() => setEditingAmount(true)}
          style={styles.amountCard}
        >
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>Số tiền</Text>
            <Text style={styles.editHint}>Chạm để sửa</Text>
          </View>
          {editingAmount ? (
            <View style={styles.amountEditor}>
              <TextInput
                accessibilityLabel="Số tiền"
                autoFocus
                keyboardType="number-pad"
                onBlur={() => setEditingAmount(false)}
                onChangeText={setAmount}
                onSubmitEditing={() => setEditingAmount(false)}
                selectTextOnFocus
                style={styles.amountInput}
                value={amount}
              />
              <Text style={styles.currency}>₫</Text>
            </View>
          ) : (
            <Text style={styles.amount}>{formatMoney(amount || '0', 'VND')}</Text>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void save()}
          pressedScale={0.98}
          style={styles.primary}
        >
          {saving ? (
            <ActivityIndicator color="#3A1D0E" />
          ) : (
            <Text style={styles.primaryText}>Lưu vào Journal</Text>
          )}
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  )
}

function formatTimestamp(value: Date) {
  return `Hôm nay · ${value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 30,
    left: 18,
    letterSpacing: -0.5,
    position: 'absolute',
    top: 35,
  },
  amountCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 88,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  amountEditor: {
    alignItems: 'baseline',
    flexDirection: 'row',
    left: 18,
    position: 'absolute',
    top: 31,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 14,
  },
  amountInput: {
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 30,
    letterSpacing: -0.5,
    minWidth: 100,
    padding: 0,
  },
  amountLabel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12 },
  captionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 92,
    marginHorizontal: 16,
    marginTop: 39,
    overflow: 'hidden',
  },
  captionInput: {
    bottom: 4,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    left: 18,
    padding: 0,
    position: 'absolute',
    right: 18,
    top: 44,
  },
  close: {
    alignItems: 'center',
    backgroundColor: '#A89E93',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    opacity: 0.9,
    width: 40,
  },
  currency: { color: colors.text, fontFamily: fonts.amount, fontSize: 28 },
  editHint: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  fieldTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
    left: 18,
    position: 'absolute',
    top: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 54,
  },
  image: { height: '100%', width: '100%' },
  photo: {
    height: 269,
    marginLeft: 16,
    marginTop: 18,
    overflow: 'visible',
    width: 344,
  },
  photoFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 70,
  },
  primaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  retake: { color: 'white', fontFamily: fonts.medium, fontSize: 14, textAlign: 'right' },
  retakeButton: { alignItems: 'flex-end', justifyContent: 'center', width: 70 },
  safe: { backgroundColor: colors.camera, flex: 1 },
  timestamp: {
    backgroundColor: colors.card,
    borderRadius: 14,
    bottom: -12,
    height: 28,
    justifyContent: 'center',
    left: 14,
    paddingHorizontal: 10,
    position: 'absolute',
  },
  timestampText: { color: colors.text, fontFamily: fonts.medium, fontSize: 12 },
  title: { color: 'white', fontFamily: fonts.semibold, fontSize: 16 },
})
