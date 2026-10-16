import { Feather } from '@expo/vector-icons'
import { type Href, router } from 'expo-router'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney, startOfLocalDay } from '@/features/api/format'
import { mediaContentSource } from '@/features/api/media'
import type { ExpenseList } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { ExpenseTicket } from '@/features/expense/components/expense-ticket'
import { JournalViewToggle } from '@/features/journal/components/journal-view-toggle'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { AnimatedPressable, useEntranceAnimation } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

const today = new Date()

export function JournalScreen() {
  const { token } = useSession()
  const totalEntrance = useEntranceAnimation(40, 8)
  const momentsEntrance = useEntranceAnimation(120, 12)
  const load = useCallback((token: string) => {
    const from = startOfLocalDay().toISOString()
    return apiRequest<ExpenseList>(`/expenses?from=${encodeURIComponent(from)}&limit=100`, {
      token,
    })
  }, [])
  const { data, error, loading, refresh } = useApiResource(load)
  const expenses = data?.data ?? []
  const total = data?.totals[0]

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.date}>
              {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(today)}
            </Text>
            <Text style={styles.title}>Hôm nay</Text>
          </View>
          <JournalViewToggle active="timeline" />
        </View>
        <Animated.View style={[styles.totalCard, totalEntrance]}>
          <Text style={styles.label}>Đã chi hôm nay</Text>
          <Text style={styles.total}>
            {formatMoney(total?.totalMinor ?? '0', total?.currency ?? 'VND')}
          </Text>
          <View style={styles.split}>
            <View style={[styles.segment, styles.food]} />
            <View style={[styles.segment, styles.travel]} />
            <View style={[styles.segment, styles.other]} />
          </View>
          <View style={styles.legend}>
            <Text style={styles.caption}>Ăn uống</Text>
            <Text style={styles.caption}>Đi lại</Text>
            <Text style={styles.caption}>Khác</Text>
            <Text style={styles.caption}>{total?.count ?? 0} khoản</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.moments, momentsEntrance]}>
          <Text style={styles.overline}>KHOẢNH KHẮC</Text>
          {loading ? <ActivityIndicator color={colors.link} /> : null}
          {error ? (
            <Pressable accessibilityRole="button" onPress={() => void refresh()}>
              <Text style={styles.error}>{error} · Chạm để thử lại</Text>
            </Pressable>
          ) : null}
          {!loading && !error && expenses.length === 0 ? (
            <Text style={styles.empty}>
              Chưa có khoản chi hôm nay. Chụp khoảnh khắc đầu tiên nhé.
            </Text>
          ) : null}
          {expenses.map((expense, index) => (
            <ExpenseTicket
              amount={formatMoney(expense.amountMinor, expense.currency)}
              imageSource={
                expense.mediaAssetId && token
                  ? mediaContentSource(expense.mediaAssetId, token)
                  : undefined
              }
              key={expense.id}
              meta={new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(expense.occurredAt))}
              onPress={() => router.push({ pathname: '/expense', params: { id: expense.id } })}
              store={expense.merchant || expense.caption || 'Khoản chi'}
              variant={index % 2 ? 'peach' : 'sage'}
            />
          ))}
        </Animated.View>
      </ScrollView>
      <AnimatedPressable
        accessibilityLabel="Chụp ngay"
        accessibilityRole="button"
        onPress={() => router.push('/capture' as Href)}
        style={styles.capture}
      >
        <Feather color="#3A1D0E" name="camera" size={23} />
        <Text style={styles.captureText}>Chụp ngay</Text>
      </AnimatedPressable>
      <BottomTabBar active="journal" />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  caption: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  capture: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.peach,
    borderRadius: 26,
    bottom: 98,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#D48C64',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    width: 168,
  },
  captureText: { color: '#3A1D0E', fontFamily: fonts.semibold, fontSize: 16 },
  content: { gap: 11, paddingBottom: 190, paddingHorizontal: 16, paddingTop: 42 },
  date: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, marginLeft: 4 },
  empty: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'center',
  },
  error: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
  food: { backgroundColor: colors.peach, flex: 5 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 57,
    justifyContent: 'space-between',
    marginLeft: 4,
  },
  label: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  other: { backgroundColor: colors.lavender, flex: 2 },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  moments: { gap: 8, marginTop: 25 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  segment: { height: 10 },
  split: { borderRadius: 5, flexDirection: 'row', gap: 3, overflow: 'hidden' },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, letterSpacing: -0.5 },
  total: { color: colors.text, fontFamily: fonts.amount, fontSize: 44, letterSpacing: -1 },
  totalCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    gap: 8,
    padding: 20,
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
  },
  travel: { backgroundColor: colors.sage, flex: 3 },
})
