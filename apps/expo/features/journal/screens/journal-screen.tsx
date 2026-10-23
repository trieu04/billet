import { Feather } from '@expo/vector-icons'
import { router, useFocusEffect, useIsFocused } from 'expo-router'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney, startOfLocalDay } from '@/features/api/format'
import type { ExpenseList } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { ExpenseTicket, mergeSavedCaptures, useCaptureFlow } from '@/features/expense'
import { JournalViewToggle } from '@/features/journal/components/journal-view-toggle'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { AnimatedPressable, useEntranceAnimation } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'
import { formatJournalDay, groupExpensesByDay } from './journal-model'
import { loadAllJournalPages } from './journal-pages'

export function JournalScreen() {
  const { token } = useSession()
  const [today] = useState(() => new Date())
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const photoTarget = useRef<View>(null)
  const firstFocus = useRef(true)
  const focused = useIsFocused()
  const { captures, insertingId, insertPhoto, reconcileCaptures } = useCaptureFlow()
  const totalEntrance = useEntranceAnimation(40, 8)
  const momentsEntrance = useEntranceAnimation(120, 12)
  const load = useCallback(async (token: string) => {
    const from = startOfLocalDay()
    from.setDate(from.getDate() - 13)
    return loadAllJournalPages((cursor) => {
      const query = new URLSearchParams({ from: from.toISOString(), limit: '100' })
      if (cursor) query.set('cursor', cursor)
      return apiRequest<ExpenseList>(`/expenses?${query.toString()}`, { token })
    })
  }, [])
  const { data, error, loading, refresh } = useApiResource(load)
  useEffect(() => {
    if (data) reconcileCaptures(data.data)
  }, [data, reconcileCaptures])
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }
      void refresh()
    }, [refresh]),
  )
  const journal = mergeSavedCaptures(data, captures, startOfLocalDay())
  const expenses = journal.data
  const dayGroups = groupExpensesByDay(expenses)
  const todayGroup = dayGroups.find((group) => formatJournalDay(group.date, today) === 'Hôm nay')
  const cardWidth = Math.min(220, windowWidth - 112)
  const measureInsertion = useCallback(() => {
    if (!focused || !insertingId) return
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    requestAnimationFrame(() =>
      photoTarget.current?.measureInWindow((x, y, width) => {
        if (width > 0)
          insertPhoto(insertingId, { x, y, width, height: width / expensePhotoAspectRatio })
      }),
    )
  }, [focused, insertPhoto, insertingId])
  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(measureInsertion)
      return () => cancelAnimationFrame(frame)
    }, [measureInsertion]),
  )

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.total}>{formatMoney(todayGroup?.totalMinor ?? '0', 'VND')}</Text>
          <View style={styles.split}>
            <View style={[styles.segment, styles.food]} />
            <View style={[styles.segment, styles.travel]} />
            <View style={[styles.segment, styles.other]} />
          </View>
          <View style={styles.legend}>
            <Text style={styles.caption}>Ăn uống</Text>
            <Text style={styles.caption}>Đi lại</Text>
            <Text style={styles.caption}>Khác</Text>
            <Text style={styles.caption}>{todayGroup?.expenses.length ?? 0} khoản</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.moments, momentsEntrance]}>
          <Text style={styles.overline}>KHOẢNH KHẮC</Text>
          {loading && expenses.length === 0 ? <ActivityIndicator color={colors.link} /> : null}
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
          {dayGroups.map((group) => (
            <View key={group.key} style={styles.dayShelf}>
              <View
                accessibilityLabel={`${formatJournalDay(group.date, today)}, ${group.expenses.length} khoản`}
                style={styles.dayHeader}
              >
                <View>
                  <Text style={styles.dayTitle}>{formatJournalDay(group.date, today)}</Text>
                  <Text style={styles.dayCount}>{group.expenses.length} khoảnh khắc</Text>
                </View>
                <Text style={styles.dayTotal}>{formatMoney(group.totalMinor)}</Text>
              </View>
              <ScrollView
                contentContainerStyle={styles.shelfContent}
                decelerationRate="fast"
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={cardWidth + 12}
              >
                {group.expenses.map((expense, index) => (
                  <View
                    key={expense.id}
                    collapsable={false}
                    ref={expense.id === insertingId ? photoTarget : undefined}
                    onLayout={expense.id === insertingId ? measureInsertion : undefined}
                    style={{ width: cardWidth }}
                  >
                    <View style={expense.id === insertingId ? { opacity: 0 } : undefined}>
                      <ExpenseTicket
                        amount={formatMoney(expense.amountMinor, expense.currency)}
                        mediaAssetId={expense.mediaAssetId ?? undefined}
                        mediaToken={token ?? undefined}
                        imageUri={
                          captures.find((capture) => capture.expense.id === expense.id)?.imageUri
                        }
                        meta={new Intl.DateTimeFormat('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(expense.occurredAt))}
                        onPress={() =>
                          router.push({ pathname: '/expense', params: { id: expense.id } })
                        }
                        overlay
                        store={expense.merchant || expense.caption || 'Khoản chi'}
                        variant={index % 2 ? 'peach' : 'sage'}
                      />
                    </View>
                    {expense.id === captures[0]?.expense.id ? (
                      <Text accessibilityLiveRegion="polite" style={styles.saved}>
                        Đã lưu vào dòng thời gian
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
      <AnimatedPressable
        accessibilityLabel="Thêm chi tiêu"
        accessibilityRole="button"
        onPress={() => router.push('/capture')}
        style={styles.capture}
      >
        <Feather color="#3A1D0E" name="camera" size={23} />
        <Text style={styles.captureText}>Thêm chi tiêu</Text>
      </AnimatedPressable>
      <BottomTabBar active="journal" />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  saved: {
    color: colors.link,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
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
  dayCount: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  dayHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayShelf: { gap: 10 },
  dayTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
  dayTotal: {
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
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
  moments: { gap: 20, marginTop: 25 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  segment: { height: 10 },
  split: { borderRadius: 5, flexDirection: 'row', gap: 3, overflow: 'hidden' },
  shelfContent: { gap: 12, paddingRight: 28 },
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
