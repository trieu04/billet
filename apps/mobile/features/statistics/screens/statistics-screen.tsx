import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { cardShadow } from '@/features/ui/card'
import { colors, fonts } from '@/features/ui/theme'

const periods = ['Tuần', 'Tháng', 'Năm'] as const
const bars = [52, 78, 40, 64, 110, 86, 30]
const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const categories = [
  { color: colors.peach, label: 'Cà phê', percent: 42 },
  { color: colors.sage, label: 'Ăn uống', percent: 26 },
  { color: colors.lavender, label: 'Đi lại', percent: 18 },
  { color: colors.butter, label: 'Khác', percent: 14 },
]

export function StatisticsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>('Tuần')

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={styles.title}>Thống kê</Text>
      <View style={styles.periods}>
        {periods.map((item) => (
          <Pressable
            key={item}
            onPress={() => setPeriod(item)}
            style={[styles.period, period === item && styles.periodSelected]}
          >
            <Text style={[styles.periodText, period === item && styles.periodTextSelected]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.summaryLabel}>
        {period === 'Tuần' ? 'Tuần này' : period === 'Tháng' ? 'Tháng này' : 'Năm nay'}
      </Text>
      <View style={styles.summary}>
        <Text style={styles.total}>1.284.000₫</Text>
        <View style={styles.delta}>
          <Text style={styles.deltaText}>↓ 12%</Text>
        </View>
      </View>
      <View style={[cardShadow, styles.barCard]}>
        <View style={styles.bars}>
          {bars.map((height, index) => (
            <View key={days[index]} style={styles.barColumn}>
              <View style={[styles.bar, { height }, index === 4 && styles.activeBar]} />
              <Text style={styles.day}>{days[index]}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[cardShadow, styles.breakdown]}>
        <Donut />
        <View style={styles.legend}>
          {categories.map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendPercent}>{item.percent}%</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.insight}>
        <Text style={styles.insightLabel}>INSIGHT</Text>
        <Text style={styles.insightText}>
          Sáng thứ Sáu là lúc bạn chi nhiều nhất, phần lớn cho cà phê.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.insightText}>Bữa trưa trung bình 92.000₫, thấp hơn tuần trước.</Text>
      </View>
      <BottomTabBar active="statistics" />
    </SafeAreaView>
  )
}

function Donut() {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const segments = categories.map((item, index) => ({
    ...item,
    length: (circumference * item.percent) / 100,
    offset:
      (circumference *
        categories.slice(0, index).reduce((sum, category) => sum + category.percent, 0)) /
      100,
  }))
  return (
    <Svg height={104} viewBox="0 0 104 104" width={104}>
      {segments.map((item) => (
        <Circle
          cx="52"
          cy="52"
          fill="none"
          key={item.label}
          r={radius}
          rotation="-90"
          stroke={item.color}
          strokeDasharray={`${item.length} ${circumference - item.length}`}
          strokeDashoffset={-item.offset}
          strokeWidth="20"
        />
      ))}
    </Svg>
  )
}

const styles = StyleSheet.create({
  activeBar: { backgroundColor: colors.peach },
  bar: { backgroundColor: '#EADFCF', borderRadius: 10, width: '100%' },
  barCard: {
    borderRadius: 24,
    height: 156,
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  barColumn: { alignItems: 'center', flex: 1, gap: 6, height: 130, justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', gap: 8 },
  breakdown: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 18,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 16,
  },
  day: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11 },
  delta: {
    backgroundColor: colors.sage,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: { color: colors.greenText, fontFamily: fonts.semibold, fontSize: 13 },
  divider: {
    backgroundColor: '#4A4170',
    height: StyleSheet.hairlineWidth,
    opacity: 0.25,
    width: '100%',
  },
  dot: { borderRadius: 5, height: 10, width: 10 },
  insight: {
    backgroundColor: '#E7E1F4',
    borderRadius: 24,
    gap: 7,
    marginHorizontal: 16,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  insightLabel: { color: '#4A4170', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6 },
  insightText: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  legend: { flex: 1, gap: 9 },
  legendLabel: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  legendPercent: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  period: { alignItems: 'center', borderRadius: 9, flex: 1, height: 30, justifyContent: 'center' },
  periodSelected: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  periodText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  periodTextSelected: { color: colors.text, fontFamily: fonts.semibold },
  periods: {
    backgroundColor: '#EAE3D8',
    borderRadius: 12,
    flexDirection: 'row',
    height: 36,
    marginHorizontal: 16,
    marginTop: 7,
    padding: 3,
  },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  summary: { alignItems: 'center', flexDirection: 'row', gap: 10, marginHorizontal: 20 },
  summaryLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 17,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginHorizontal: 20,
    marginTop: 21,
  },
  total: { color: colors.text, fontFamily: fonts.amount, fontSize: 38, letterSpacing: -1 },
})
