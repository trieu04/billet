import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { type Href, router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { JournalViewToggle } from '@/features/journal/components/journal-view-toggle'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { colors, fonts } from '@/features/ui/theme'

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const heat = ['#F6CDB9', '#EFA282', '#E36A55', '#C93A3A', '#8F1D24']
type Gradient = readonly [string, string]
type Day = { day?: number; dots?: number[]; future?: boolean; month?: number; photos?: Gradient[] }
const p = colors.peachSoft
const l = colors.lavender
const s = colors.sage
const b = colors.butter
const days: Day[] = [
  {},
  {},
  {},
  { day: 1, dots: [3], photos: [[p, l]] },
  { day: 2, dots: [1] },
  {
    day: 3,
    dots: [4, 3],
    photos: [
      [b, p],
      [s, l],
    ],
  },
  {
    day: 4,
    dots: [3, 5, 3],
    photos: [
      [s, l],
      [s, b],
      [p, l],
    ],
  },
  { day: 5, dots: [1] },
  { day: 6, dots: [3], photos: [[p, l]] },
  {
    day: 7,
    dots: [3, 4, 3],
    photos: [
      [l, s],
      [b, p],
      [s, l],
    ],
  },
  { day: 8, dots: [1] },
  { day: 9, dots: [5], photos: [[s, l]] },
  {
    day: 10,
    dots: [3, 2],
    photos: [
      [s, b],
      [p, l],
    ],
  },
  {
    day: 11,
    dots: [5, 4],
    photos: [
      [p, l],
      [l, s],
    ],
  },
  { day: 12, dots: [1] },
  { day: 13, dots: [3], photos: [[b, p]] },
  {
    day: 14,
    dots: [2, 2, 2],
    photos: [
      [s, l],
      [s, b],
      [p, l],
    ],
  },
  ...Array.from({ length: 17 }, (_, index) => ({ day: index + 15, future: true })),
  {},
]
const weeks = Array.from({ length: 5 }, (_, index) => days.slice(index * 7, index * 7 + 7))
const septemberDays: Day[] = [
  {},
  ...Array.from({ length: 30 }, (_, index): Day => {
    const day = index + 1
    if (day === 28) return { day, dots: [2], month: 9, photos: [[b, p]] }
    if (day === 29) return { day, dots: [1], month: 9 }
    if (day === 30)
      return {
        day,
        dots: [3, 2],
        month: 9,
        photos: [
          [s, b],
          [p, l],
        ],
      }
    return { day, month: 9 }
  }),
  ...Array.from({ length: 4 }, () => ({})),
]
const septemberWeeks = Array.from({ length: 5 }, (_, index) =>
  septemberDays.slice(index * 7, index * 7 + 7),
)
const novemberDays: Day[] = [
  ...Array.from({ length: 6 }, () => ({})),
  ...Array.from({ length: 30 }, (_, index) => ({ day: index + 1, future: true, month: 11 })),
  ...Array.from({ length: 6 }, () => ({})),
]
const novemberWeeks = Array.from({ length: 6 }, (_, index) =>
  novemberDays.slice(index * 7, index * 7 + 7),
)

export function CalendarScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
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
      <View style={styles.weekdays}>
        {weekdays.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <ScrollView
        accessibilityLabel="Các tháng trong nhật ký"
        contentContainerStyle={styles.monthsContent}
        contentOffset={{ x: 0, y: 353 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.monthsViewport}
      >
        <View style={[styles.boardShadow, styles.previousMonth]}>
          <View style={styles.monthHeader}>
            <Text style={styles.month}>Tháng 9, 2026</Text>
            <Text style={styles.monthTotal}>2.914.000₫</Text>
          </View>
          <View style={styles.days}>
            {septemberWeeks.map((week, wi) => (
              <View key={wi} style={styles.week}>
                {week.map((data, di) => (
                  <MomentCell data={data} key={`september-${wi}-${di}`} />
                ))}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.stringAnchor}>
          <View style={styles.stringOne} />
          <View style={styles.stringTwo} />
        </View>
        <View style={[styles.boardShadow, styles.calendar]}>
          <View style={styles.monthHeader}>
            <Text style={styles.month}>Tháng 10, 2026</Text>
            <Text style={styles.monthTotal}>3.840.000₫</Text>
          </View>
          <View style={styles.days}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.week}>
                {week.map((data, di) => (
                  <MomentCell data={data} key={`${wi}-${di}`} />
                ))}
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.boardShadow, styles.nextCalendar]}>
          <View style={styles.monthHeader}>
            <Text style={styles.month}>Tháng 11, 2026</Text>
            <Text style={styles.monthTotal}>0₫</Text>
          </View>
          <View style={styles.days}>
            {novemberWeeks.map((week, wi) => (
              <View key={wi} style={styles.week}>
                {week.map((data, di) => (
                  <MomentCell data={data} key={`november-${wi}-${di}`} />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/expense' as Href)}
        style={styles.summary}
      >
        <View style={styles.summaryPhotos}>
          {[
            [s, l],
            [s, b],
            [p, l],
          ].map((gradient, index) => (
            <LinearGradient
              colors={gradient as [string, string]}
              key={index}
              style={[styles.summaryPhoto, { left: index * 12 }]}
            />
          ))}
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryDate}>Thứ Tư, 14/10</Text>
          <Text style={styles.summaryCount}>3 khoản</Text>
        </View>
        <Text style={styles.summaryAmount}>248.000₫</Text>
        <Feather color={colors.textSecondary} name="chevron-right" size={18} />
      </Pressable>
      <BottomTabBar active="journal" />
    </SafeAreaView>
  )
}

function MomentCell({ data }: { data: Day }) {
  const canOpen = Boolean(data.photos?.length)
  return (
    <Pressable
      accessibilityLabel={data.day ? `Ngày ${data.day} tháng ${data.month ?? 10}` : undefined}
      disabled={!canOpen}
      onPress={() => canOpen && router.push('/expense' as Href)}
      style={[styles.dayCell, data.future && styles.futureDay]}
    >
      {data.photos ? <PhotoStack photos={data.photos} /> : null}
      {data.dots ? (
        <View style={[styles.expenseDots, !data.photos && styles.centeredDots]}>
          {data.dots.map((level, index) => (
            <View
              key={`${level}-${index}`}
              style={[
                styles.expenseDot,
                { backgroundColor: heat[level - 1], marginLeft: index ? -4 : 0 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  )
}

function PhotoStack({ photos }: { photos: Gradient[] }) {
  if (photos.length === 1)
    return <LinearGradient colors={photos[0]} end={{ x: 1, y: 1 }} style={styles.singlePhoto} />
  const rotations = [-6, 5, -1]
  const left = [-2, 7, 3]
  const top = [8, 3, 8]
  return (
    <View style={styles.photoStack}>
      {photos.map((gradient, index) => (
        <LinearGradient
          colors={gradient}
          end={{ x: 1, y: 1 }}
          key={index}
          style={[
            styles.stackedPhoto,
            {
              left: left[index],
              top: top[index],
              transform: [{ rotate: `${rotations[index]}deg` }],
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  boardShadow: {
    backgroundColor: colors.card,
    shadowColor: '#5A3C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  calendar: {
    borderRadius: 28,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    top: 459,
    width: 358,
  },
  centeredDots: { top: 31 },
  dayCell: { height: 69.486, position: 'relative', width: 43.429 },
  days: { gap: 6, paddingBottom: 12, paddingHorizontal: 12, paddingTop: 10 },
  expenseDot: { borderColor: colors.card, borderRadius: 4.5, borderWidth: 1, height: 9, width: 9 },
  expenseDots: { alignSelf: 'center', bottom: 4, flexDirection: 'row', position: 'absolute' },
  futureDay: { backgroundColor: '#EAE3D8', borderRadius: 10 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 41,
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 15,
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
  month: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  monthHeader: {
    alignItems: 'center',
    backgroundColor: colors.peachSoft,
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  monthTotal: { color: colors.text, fontFamily: fonts.amount, fontSize: 14 },
  monthsContent: { height: 1500, position: 'relative' },
  monthsViewport: { height: 540, marginTop: 5 },
  nextCalendar: {
    borderRadius: 28,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    top: 912,
    width: 358,
  },
  photoStack: { height: 54, position: 'relative', width: 43.429 },
  previousMonth: {
    borderRadius: 28,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 358,
  },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  singlePhoto: { borderRadius: 9, height: 50, left: 1, position: 'absolute', top: 3, width: 41 },
  stackedPhoto: {
    borderColor: colors.card,
    borderRadius: 8,
    borderWidth: 1.5,
    height: 44,
    position: 'absolute',
    width: 34,
  },
  stringAnchor: { left: 143, position: 'absolute', top: 426 },
  stringOne: {
    borderBottomColor: '#C9B59B',
    borderBottomLeftRadius: 18,
    borderBottomWidth: 2,
    borderLeftColor: '#C9B59B',
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    height: 18,
    transform: [{ rotate: '17deg' }],
    width: 28,
  },
  stringTwo: {
    borderStyle: 'dashed',
    borderTopColor: '#C9B59B',
    borderTopWidth: 2,
    height: 8,
    left: 23,
    position: 'absolute',
    top: 16,
    transform: [{ rotate: '20deg' }],
    width: 29,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    bottom: 92,
    flexDirection: 'row',
    gap: 12,
    height: 54,
    left: 16,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 16,
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
    height: 32,
    position: 'absolute',
    top: 2,
    width: 28,
  },
  summaryPhotos: { height: 36, position: 'relative', width: 52 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 34, letterSpacing: -0.5 },
  week: { flexDirection: 'row', gap: 5 },
  weekday: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'center',
    width: 43.429,
  },
  weekdays: { flexDirection: 'row', gap: 5, marginLeft: 28, marginTop: 8 },
})
