import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Animated, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney, localMonth } from '@/features/api/format'
import type { Budget, Profile } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { cardShadow } from '@/features/ui/card'
import { AnimatedPressable, useEntranceAnimation, useReducedMotion } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

const currentMonthNumber = new Date().getMonth() + 1
const daysRemaining =
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() -
  new Date().getDate() +
  1

export function ProfileScreen() {
  const { logout } = useSession()
  const load = useCallback(async (token: string) => {
    const profile = await apiRequest<Profile>('/profile', { token })
    const budget = await apiRequest<Budget>(
      `/budgets?month=${localMonth()}&currency=${profile.settings.defaultCurrency}`,
      { token },
    )
    return { profile, budget }
  }, [])
  const { data, error } = useApiResource(load)
  const [faceIdEnabled, setFaceIdEnabled] = useState(true)
  const reducedMotion = useReducedMotion()
  const [progressAnimation] = useState(() => new Animated.Value(0))
  const identityEntrance = useEntranceAnimation(30, 8)
  const cardsEntrance = useEntranceAnimation(100, 10)
  const profile = data?.profile
  const budget = data?.budget
  const settings = [
    { label: 'Tiền tệ', value: profile?.settings.defaultCurrency ?? '…' },
    {
      label: 'Nhắc ghi chép',
      value: profile?.settings.reminderEnabled ? (profile.settings.reminderTime ?? 'Bật') : 'Tắt',
    },
    { label: 'Giao diện', value: appearanceLabel(profile?.settings.appearance) },
  ]
  const progress = budget?.limitMinor
    ? Math.min(1, Number(budget.spentMinor) / Number(budget.limitMinor))
    : 0

  useEffect(() => {
    if (reducedMotion) {
      progressAnimation.setValue(progress)
      return
    }
    Animated.spring(progressAnimation, {
      toValue: progress,
      damping: 22,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: false,
    }).start()
  }, [progress, progressAnimation, reducedMotion])

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <Text style={styles.title}>Hồ sơ</Text>
      <Animated.View style={[cardShadow, styles.identity, identityEntrance]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.displayName.slice(0, 1).toUpperCase() ?? '…'}
          </Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>
            {profile?.displayName ?? (error ? 'Không thể tải hồ sơ' : 'Đang tải…')}
          </Text>
          <Text style={styles.moments}>Đã lưu {profile?.expenseCount ?? 0} khoảnh khắc</Text>
        </View>
      </Animated.View>

      <Animated.View style={[cardShadow, styles.budget, cardsEntrance]}>
        <Text style={styles.sectionLabel}>Ngân sách tháng {currentMonthNumber}</Text>
        <Text style={styles.budgetAmount}>
          {formatMoney(budget?.spentMinor ?? '0', budget?.currency)}{' '}
          <Text style={styles.budgetLimit}>
            / {budget?.limitMinor ? formatMoney(budget.limitMinor, budget.currency) : 'Chưa đặt'}
          </Text>
        </Text>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.progress,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 322],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.budgetHint}>
          {budget?.remainingMinor
            ? `Còn ${formatMoney(budget.remainingMinor, budget.currency)} cho ${daysRemaining} ngày`
            : 'Bạn chưa đặt ngân sách tháng này'}
        </Text>
      </Animated.View>

      <View style={[cardShadow, styles.group]}>
        {settings.map((setting, index) => (
          <AnimatedPressable
            accessibilityRole="button"
            key={setting.label}
            onPress={() => Alert.alert(setting.label, `Đang dùng ${setting.value}`)}
            style={[styles.row, index < settings.length - 1 && styles.border]}
          >
            <Text style={styles.rowLabel}>{setting.label}</Text>
            <View style={styles.rowValue}>
              <Text style={styles.value}>{setting.value}</Text>
              <Feather color="#A0978D" name="chevron-right" size={18} />
            </View>
          </AnimatedPressable>
        ))}
      </View>

      <View style={[cardShadow, styles.group, styles.lastGroup]}>
        <View style={[styles.row, styles.border]}>
          <Text style={styles.rowLabel}>Khóa bằng Face ID</Text>
          <Switch
            accessibilityLabel="Face ID"
            ios_backgroundColor="#DDD5C9"
            onValueChange={setFaceIdEnabled}
            thumbColor="white"
            trackColor={{ false: '#DDD5C9', true: '#F2A183' }}
            value={faceIdEnabled}
          />
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Xuất dữ liệu', 'Dữ liệu của bạn đang được chuẩn bị.')}
          style={[styles.row, styles.border]}
        >
          <Text style={styles.rowLabel}>Xuất dữ liệu</Text>
          <Feather color="#A0978D" name="chevron-right" size={18} />
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityHint="Nhấn giữ để đăng xuất"
          accessibilityRole="button"
          onLongPress={() => void logout()}
          onPress={() => Alert.alert('Billet', 'Phiên bản 1.0')}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Về Billet</Text>
          <View style={styles.rowValue}>
            <Text style={styles.value}>v1.0</Text>
            <Feather color="#A0978D" name="chevron-right" size={18} />
          </View>
        </AnimatedPressable>
      </View>
      <BottomTabBar active="profile" />
    </SafeAreaView>
  )
}

function appearanceLabel(appearance: Profile['settings']['appearance'] | undefined) {
  if (appearance === 'light') return 'Sáng'
  if (appearance === 'dark') return 'Tối'
  return 'Tự động'
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: { color: '#7A3E22', fontFamily: fonts.bold, fontSize: 24 },
  border: { borderBottomColor: '#F0EADF', borderBottomWidth: StyleSheet.hairlineWidth },
  budget: {
    borderRadius: 22,
    height: 148,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
  },
  budgetAmount: { color: colors.text, fontFamily: fonts.amount, fontSize: 30, marginTop: 7 },
  budgetHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 8,
  },
  budgetLimit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  group: {
    borderRadius: 22,
    height: 174,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  identity: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    height: 96,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
  },
  identityText: { flex: 1, marginLeft: 16 },
  lastGroup: { marginTop: 8 },
  moments: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginTop: 6 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  progress: { backgroundColor: colors.peach, borderRadius: 6, height: 12 },
  row: {
    alignItems: 'center',
    backgroundColor: colors.card,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  rowLabel: { color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  rowValue: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  sectionLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginHorizontal: 20,
    marginTop: 62,
  },
  track: {
    backgroundColor: '#EADFCF',
    borderRadius: 6,
    height: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  value: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16 },
})
