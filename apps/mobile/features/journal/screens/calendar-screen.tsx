import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { type Href, router } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthenticatedImage } from '@/features/api/authenticated-image'
import { apiRequest } from '@/features/api/client'
import { formatMoney, localDate, localMonth } from '@/features/api/format'
import type { Calendar, CalendarHistory } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { JournalViewToggle } from '@/features/journal/components/journal-view-toggle'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'
import {
  buildCalendar,
  calendarGradients as gradients,
  type CalendarDayModel as Day,
  type CalendarPhoto,
} from './calendar-model'

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const heat = ['#F6CDB9', '#EFA282', '#E36A55', '#C93A3A', '#8F1D24']
const todayKey = localDate()
const fallbackSummaryPhotos: CalendarPhoto[] = gradients.map((gradient) => ({
  gradient,
  mediaAssetId: null,
}))

export function CalendarScreen() {
  const { token } = useSession()
  const currentMonth = localMonth()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
  const { width } = useWindowDimensions()
  const boardWidth = Math.min(width - 32, 430)
  const scrollRef = useRef<ScrollView>(null)
  const positionedAtCurrentMonth = useRef(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const load = useCallback(
    (token: string) =>
      apiRequest<CalendarHistory>(
        `/expenses/calendar/history?throughMonth=${currentMonth}&currency=VND&timezone=${encodeURIComponent(timezone)}`,
        { token },
      ),
    [currentMonth, timezone],
  )
  const { data, error, loading, refresh } = useApiResource(load)
  const calendars = useMemo(() => data?.months ?? [], [data?.months])
  const daysByMonth = useMemo(
    () => calendars.map((calendar) => buildCalendar(calendar.month, calendar)),
    [calendars],
  )
  const allDays = useMemo(() => daysByMonth.flat(), [daysByMonth])
  const currentDays = daysByMonth.at(-1) ?? []
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selected =
    allDays.find((day) => day.date === selectedDate) ??
    currentDays.find((day) => day.count) ??
    currentDays.find((day) => day.date === todayKey)
  const currency = calendars.at(-1)?.currency ?? 'VND'

  useEffect(() => {
    positionedAtCurrentMonth.current = false
  }, [data])

  useEffect(() => {
    if (
      !calendars.length ||
      !contentHeight ||
      !viewportHeight ||
      contentHeight <= viewportHeight ||
      positionedAtCurrentMonth.current
    )
      return
    scrollRef.current?.scrollTo({
      animated: false,
      y: Math.max(0, contentHeight - viewportHeight),
    })
    positionedAtCurrentMonth.current = true
  }, [calendars.length, contentHeight, viewportHeight])

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Nhật ký</Text>
        <JournalViewToggle active="grid" />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Mỗi chấm là một khoản</Text>
        <Text style={styles.legendText}>·</Text>
        <Text style={styles.legendText}>Ít</Text>
        <View style={styles.heatScale}>
          {heat.map((color, index) => (
            <View
              key={color}
              style={[styles.heatDot, { backgroundColor: color, marginLeft: index ? -6 : 0 }]}
            />
          ))}
        </View>
        <Text style={styles.legendText}>Nhiều</Text>
      </View>
      <View style={[styles.weekdays, { width: boardWidth }]}>
        {weekdays.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      <ScrollView
        accessibilityLabel="Các tháng trong nhật ký"
        contentContainerStyle={styles.monthsContent}
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        onLayout={(event: LayoutChangeEvent) => setViewportHeight(event.nativeEvent.layout.height)}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.monthsViewport}
      >
        {loading ? <ActivityIndicator color={colors.link} style={styles.loading} /> : null}
        {error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={styles.errorBox}
          >
            <Text style={styles.error}>{error} · Chạm để thử lại</Text>
          </Pressable>
        ) : null}
        {calendars.map((calendar, index) => (
          <MonthBoard
            calendar={calendar}
            days={daysByMonth[index] ?? []}
            key={calendar.month}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
            token={token}
          />
        ))}
      </ScrollView>

      {!loading && !error ? (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => router.replace('/' as Href)}
          style={[styles.summary, { left: (width - boardWidth) / 2, width: boardWidth }]}
        >
          <PhotoStack photos={selected?.photos ?? fallbackSummaryPhotos} summary token={token} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryDate}>{formatSelectedDate(selected?.date)}</Text>
            <Text style={styles.summaryCount}>{selected?.count ?? 0} khoản</Text>
          </View>
          <Text style={styles.summaryAmount}>
            {formatMoney(selected?.totalMinor ?? '0', currency)}
          </Text>
          <Feather color={colors.textSecondary} name="chevron-right" size={18} />
        </AnimatedPressable>
      ) : null}
      <BottomTabBar active="journal" />
    </SafeAreaView>
  )
}

function MonthBoard({
  calendar,
  days,
  onSelectDate,
  selectedDate,
  token,
}: {
  calendar: Calendar
  days: Day[]
  onSelectDate: (date: string) => void
  selectedDate: string | null
  token: string | null
}) {
  const [year, monthNumber] = calendar.month.split('-').map(Number)
  return (
    <View style={styles.monthBoard}>
      <View style={styles.monthHeader}>
        <Text style={styles.month}>
          Tháng {monthNumber}, {year}
        </Text>
        <Text style={styles.monthTotal}>{formatMoney(calendar.totalMinor, calendar.currency)}</Text>
      </View>
      <View style={styles.days}>
        {chunkWeeks(days).map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <MomentCell
                data={day}
                key={day.date ?? `${calendar.month}-blank-${weekIndex}-${dayIndex}`}
                onPress={() => day.date && onSelectDate(day.date)}
                selected={day.date === selectedDate}
                token={token}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

function MomentCell({
  data,
  onPress,
  selected,
  token,
}: {
  data: Day
  onPress: () => void
  selected: boolean
  token: string | null
}) {
  const hasExpense = Boolean(data.photos?.length || data.count)
  const isDay = Boolean(data.day)
  const isSelectable = isDay && !data.future
  const label = data.day
    ? `Ngày ${data.day} tháng ${data.month}, ${data.future ? 'chưa tới' : data.count ? `${data.count} khoản` : 'chưa có khoản chi'}`
    : undefined

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole={isSelectable ? 'button' : undefined}
      accessibilityState={{ disabled: !isSelectable, selected }}
      disabled={!isSelectable}
      onPress={onPress}
      pressedScale={isSelectable ? 0.94 : 1}
      style={[
        styles.dayCell,
        data.future && styles.futureDay,
        selected && hasExpense && styles.selectedDay,
      ]}
    >
      {data.photos ? <PhotoStack photos={data.photos} token={token} /> : null}
      {isSelectable && !hasExpense ? (
        <View style={[styles.emptyDayDot, selected && styles.selectedEmptyDayDot]} />
      ) : null}
      <View style={styles.dotModule}>
        {data.dots?.length ? (
          <View style={styles.expenseDots}>
            {data.dots.map((level, index) => (
              <View
                key={`${level}-${index}`}
                style={[
                  styles.expenseDot,
                  {
                    backgroundColor: heat[level - 1],
                    marginLeft: index ? -4 : 0,
                    width: `${Math.min(20, 90 / data.dots!.length)}%`,
                    zIndex: index,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  )
}

function PhotoStack({
  photos,
  summary = false,
  token,
}: {
  photos: readonly CalendarPhoto[]
  summary?: boolean
  token: string | null
}) {
  if (summary) {
    return (
      <View style={styles.summaryPhotos}>
        {photos.slice(0, 3).map((photo, index) => {
          const style = [styles.summaryPhoto, { left: index * 12 }]
          return photo.mediaAssetId && token ? (
            <AuthenticatedImage
              accessibilityLabel="Ảnh khoản chi"
              fallback={<LinearGradient colors={photo.gradient} style={style} />}
              key={photo.mediaAssetId}
              mediaAssetId={photo.mediaAssetId}
              style={style}
              token={token}
            />
          ) : (
            <LinearGradient colors={photo.gradient} key={index} style={style} />
          )
        })}
      </View>
    )
  }

  const visiblePhotos = photos.slice(0, 3)
  const stackSize = visiblePhotos.length
  const width = stackSize === 1 ? 100 : stackSize === 2 ? 84 : 78
  const offset = stackSize === 2 ? 16 : stackSize === 3 ? 11 : 0
  const rotations = stackSize === 2 ? [-4, 4] : stackSize === 3 ? [-6, 5, -1] : [0]
  const verticalOffsets = stackSize === 2 ? [16, 0] : stackSize === 3 ? [20, 0, 8] : [0]
  return (
    <View style={styles.photoStack}>
      {visiblePhotos.map((photo, index) => {
        const style = [
          styles.calendarPhoto,
          stackSize > 1 && styles.stackedPhoto,
          {
            left: `${index * offset}%` as const,
            top: `${verticalOffsets[index]}%` as const,
            transform: [{ rotate: `${rotations[index]}deg` }],
            width: `${width}%` as const,
            zIndex: index,
          },
        ]
        return photo.mediaAssetId && token ? (
          <AuthenticatedImage
            accessibilityLabel="Ảnh khoản chi"
            fallback={<LinearGradient colors={photo.gradient} end={{ x: 1, y: 1 }} style={style} />}
            key={photo.mediaAssetId}
            mediaAssetId={photo.mediaAssetId}
            style={style}
            token={token}
          />
        ) : (
          <LinearGradient colors={photo.gradient} end={{ x: 1, y: 1 }} key={index} style={style} />
        )
      })}
    </View>
  )
}

function chunkWeeks(days: Day[]) {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  )
}

function formatSelectedDate(date?: string) {
  if (!date) return 'Tháng này'
  const value = new Date(`${date}T12:00:00`)
  const weekday = value.toLocaleDateString('vi-VN', { weekday: 'long' })
  return `${weekday.slice(0, 1).toUpperCase()}${weekday.slice(1)}, ${value.getDate()}/${value.getMonth() + 1}`
}

const styles = StyleSheet.create({
  dayCell: { aspectRatio: 0.625, flex: 1, minWidth: 0, position: 'relative' },
  days: { gap: 6, paddingBottom: 12, paddingHorizontal: 12, paddingTop: 10 },
  emptyDayDot: {
    backgroundColor: '#CFC7BB',
    borderRadius: 5,
    height: 10,
    left: '50%',
    marginLeft: -5,
    marginTop: -5,
    opacity: 0.58,
    position: 'absolute',
    top: '39.0625%',
    width: 10,
  },
  error: { color: '#B3433C', fontFamily: fonts.medium, padding: 8, textAlign: 'center' },
  errorBox: { marginVertical: 20 },
  expenseDot: {
    aspectRatio: 1,
    borderColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 9,
  },
  expenseDots: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  dotModule: {
    alignItems: 'center',
    bottom: 0,
    height: '21.875%',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    width: '100%',
  },
  futureDay: { backgroundColor: '#E9E2D7', borderRadius: 10, opacity: 0.72 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 41,
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 54,
  },
  heatDot: { borderColor: colors.card, borderRadius: 6, borderWidth: 1, height: 12, width: 12 },
  heatScale: { flexDirection: 'row' },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 14,
    marginLeft: 20,
    marginTop: 7,
  },
  legendText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  loading: { marginTop: 40 },
  month: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  monthBoard: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    maxWidth: 430,
    overflow: 'hidden',
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    width: '100%',
  },
  monthHeader: {
    alignItems: 'center',
    backgroundColor: colors.peachSoft,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  monthsContent: {
    gap: 18,
    paddingBottom: 172,
    paddingHorizontal: 16,
    paddingTop: 5,
  },
  monthsViewport: { flex: 1, marginTop: 5 },
  monthTotal: { color: colors.text, fontFamily: fonts.amount, fontSize: 15 },
  photoStack: { height: '78.125%', position: 'relative', width: '100%' },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  selectedDay: { borderColor: colors.link, borderWidth: 1.5 },
  selectedEmptyDayDot: { borderColor: colors.link, borderWidth: 1.5, opacity: 1 },
  calendarPhoto: {
    aspectRatio: 0.8,
    borderRadius: 9,
    position: 'absolute',
  },
  stackedPhoto: {
    borderColor: colors.card,
    borderWidth: 1.5,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    bottom: 84,
    flexDirection: 'row',
    gap: 12,
    height: 60,
    paddingHorizontal: 16,
    position: 'absolute',
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  summaryAmount: { color: colors.text, fontFamily: fonts.amount, fontSize: 19 },
  summaryCopy: { flex: 1 },
  summaryCount: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  summaryDate: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  summaryPhoto: {
    borderColor: colors.card,
    borderRadius: 8,
    borderWidth: 2,
    height: 34,
    position: 'absolute',
    top: 1,
    width: 28,
  },
  summaryPhotos: { height: 36, position: 'relative', width: 52 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, letterSpacing: -0.5 },
  week: { flexDirection: 'row', gap: 5 },
  weekday: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  weekdays: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 12,
  },
})
