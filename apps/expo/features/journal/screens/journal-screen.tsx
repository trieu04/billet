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
  const momentsEntrance = useEntranceAnimation(40, 8)
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
            <Text style={styles.title}>Nhật ký</Text>
          </View>
          <JournalViewToggle active="timeline" />
        </View>
        <Animated.View style={[styles.moments, momentsEntrance]}>
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
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 57,
    justifyContent: 'space-between',
    marginLeft: 4,
  },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  moments: { gap: 20, marginTop: 25 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  shelfContent: { gap: 12, paddingRight: 28 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, letterSpacing: -0.5 },
})
