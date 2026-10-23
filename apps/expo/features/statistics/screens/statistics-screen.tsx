import { useCallback, useEffect, useMemo, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { cardShadow } from '@/features/ui/card'
import { AnimatedPressable, useEntranceAnimation, useReducedMotion } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'
import { apiRequest } from '@/features/api/client'
import { formatMoney, startOfLocalDay } from '@/features/api/format'
import type { SpendingReport } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'

const periods = ['Tuần', 'Tháng', 'Năm'] as const
const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const palette = [colors.peach, colors.sage, colors.lavender, colors.butter]

export function StatisticsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>('Tuần')
  const reducedMotion = useReducedMotion()
  const [chartProgress] = useState(() => new Animated.Value(0))
  const chartEntrance = useEntranceAnimation(50, 8)
  const detailEntrance = useEntranceAnimation(120, 10)
  const range = useMemo(() => reportRange(period), [period])
  const load = useCallback(
    (token: string) =>
      apiRequest<SpendingReport>(
        `/reports/spending?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&currency=VND&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh')}&granularity=${range.granularity}`,
        { token },
      ),
    [range],
  )
  const { data: report, error, loading } = useApiResource(load)
  const maximum = Math.max(...(report?.series.map((item) => Number(item.totalMinor)) ?? [0]), 1)
  const bars = days.map((_, index) => {
    const value = Number(report?.series[index]?.totalMinor ?? 0)
    return Math.max(4, Math.round((value / maximum) * 110))
  })
  const categories = (report?.categories ?? []).slice(0, 4).map((item, index) => ({
    color: palette[index] ?? colors.chip,
    label: item.name,
    percent: Math.round(item.sharePercent ?? 0),
  }))

  useEffect(() => {
    if (reducedMotion) {
      chartProgress.setValue(1)
      return
    }
    chartProgress.setValue(0)
    Animated.timing(chartProgress, {
      toValue: 1,
      duration: 520,
      useNativeDriver: false,
    }).start()
  }, [chartProgress, period, reducedMotion, report])

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <Text style={styles.title}>Thống kê</Text>
      <View style={styles.periods}>
        {periods.map((item) => (
          <AnimatedPressable
            accessibilityRole="tab"
            accessibilityState={{ selected: period === item }}
            key={item}
            onPress={() => setPeriod(item)}
            pressedScale={0.96}
            style={[styles.period, period === item && styles.periodSelected]}
          >
            <Text style={[styles.periodText, period === item && styles.periodTextSelected]}>
              {item}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
      <Text style={styles.summaryLabel}>
        {period === 'Tuần' ? 'Tuần này' : period === 'Tháng' ? 'Tháng này' : 'Năm nay'}
      </Text>
      <View style={styles.summary}>
        <Text style={styles.total}>
          {loading ? '…' : formatMoney(report?.totalMinor ?? '0', report?.currency ?? 'VND')}
        </Text>
        <View style={styles.delta}>
          <Text style={styles.deltaText}>{formatDelta(report?.comparison.changePercent)}</Text>
        </View>
      </View>
      <Animated.View style={[cardShadow, styles.barCard, chartEntrance]}>
        <View style={styles.bars}>
          {bars.map((height, index) => (
            <View key={days[index]} style={styles.barColumn}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: chartProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, height],
                    }),
                  },
                  index === 4 && styles.activeBar,
                ]}
              />
              <Text style={styles.day}>{days[index]}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      <Animated.View style={[cardShadow, styles.breakdown, detailEntrance]}>
        <Donut categories={categories} />
        <View style={styles.legend}>
          {categories.map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendPercent}>{item.percent}%</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      <View style={styles.insight}>
        <Text style={styles.insightLabel}>INSIGHT</Text>
        <Text numberOfLines={2} style={styles.insightText}>
          {error
            ? error
            : report?.insights[0]
              ? `Ngày chi nhiều nhất là ${new Date(report.insights[0].date).toLocaleDateString('vi-VN')}, với ${formatMoney(report.insights[0].amountMinor, report.currency)}.`
              : 'Chưa đủ dữ liệu để tạo insight cho kỳ này.'}
        </Text>
        <View style={styles.divider} />
        <Text numberOfLines={2} style={styles.insightText}>
          {report?.count
            ? `Trung bình mỗi khoản là ${formatMoney(String(Math.round(Number(report.totalMinor) / report.count)), report.currency)}.`
            : 'Ghi thêm vài khoản để Billet tìm ra thói quen của bạn.'}
        </Text>
      </View>
      <BottomTabBar active="statistics" />
    </SafeAreaView>
  )
}

function Donut({
  categories,
}: {
  categories: { color: string; label: string; percent: number }[]
}) {
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

function reportRange(period: (typeof periods)[number]) {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = startOfLocalDay(to)
  if (period === 'Tuần') from.setDate(from.getDate() - 6)
  else if (period === 'Tháng') from.setDate(1)
  else from.setMonth(0, 1)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: period === 'Năm' ? 'month' : 'day',
  }
}

function formatDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${value <= 0 ? '↓' : '↑'} ${Math.abs(Math.round(value))}%`
}

const styles = StyleSheet.create({
  activeBar: { backgroundColor: colors.peach },
  bar: { backgroundColor: '#EADFCF', borderRadius: 10, width: '100%' },
  barCard: {
    borderRadius: 24,
    height: 188,
    marginHorizontal: 16,
    marginTop: 23,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  barColumn: { alignItems: 'center', flex: 1, gap: 8, height: 145, justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', gap: 8 },
  breakdown: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 18,
    marginHorizontal: 16,
    height: 164,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
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
    height: 114,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  insightLabel: { color: '#4A4170', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6 },
  insightText: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  legend: { flex: 1, gap: 9 },
  legendLabel: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  legendPercent: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  period: { alignItems: 'center', borderRadius: 9, flex: 1, height: 36, justifyContent: 'center' },
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
    height: 40,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 2,
  },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 7,
  },
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
    marginTop: 62,
  },
  total: { color: colors.text, fontFamily: fonts.amount, fontSize: 38, letterSpacing: -1 },
})
