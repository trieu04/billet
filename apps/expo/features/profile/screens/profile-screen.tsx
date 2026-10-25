import { Feather } from '@expo/vector-icons'
import { type Href, router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Appearance,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiRequest } from '@/features/api/client'
import { formatMoney, localMonth } from '@/features/api/format'
import type { Budget, Profile } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { useBiometricLock } from '@/features/settings/biometric-lock'
import { deviceTimezone, updateSettings } from '@/features/settings/settings-api'
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
  const { logout, token } = useSession()
  const biometric = useBiometricLock()
  const load = useCallback(async (token: string) => {
    const profile = await apiRequest<Profile>('/profile', { token })
    const budget = await apiRequest<Budget>(
      `/budgets?month=${localMonth()}&currency=${profile.settings.defaultCurrency}`,
      { token },
    )
    return { profile, budget }
  }, [])
  const { data, error, refresh } = useApiResource(load)
  const reducedMotion = useReducedMotion()
  const [progressAnimation] = useState(() => new Animated.Value(0))
  const identityEntrance = useEntranceAnimation(30, 8)
  const cardsEntrance = useEntranceAnimation(100, 10)
  const profile = data?.profile
  const budget = data?.budget
  const settings: Array<{ label: string; onPress(): void; value: string }> = [
    {
      label: 'Tiền tệ',
      onPress: () =>
        presentChoice(
          'Tiền tệ mặc định',
          ['VND', 'USD', 'EUR', 'JPY'],
          profile?.settings.defaultCurrency,
          (defaultCurrency) => void saveQuickSetting({ defaultCurrency }),
        ),
      value: profile?.settings.defaultCurrency ?? '…',
    },
    {
      label: 'Giao diện',
      onPress: () =>
        presentChoice(
          'Giao diện',
          ['Theo hệ thống', 'Sáng', 'Tối'],
          appearanceLabel(profile?.settings.appearance),
          (label) => {
            const appearance =
              label === 'Sáng' ? ('light' as const) : label === 'Tối' ? ('dark' as const) : 'system'
            Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance)
            void saveQuickSetting({ appearance })
          },
        ),
      value: appearanceLabel(profile?.settings.appearance),
    },
    {
      label: 'Múi giờ',
      onPress: () => {
        const timezone = deviceTimezone()
        if (timezone === profile?.settings.timezone) {
          Alert.alert('Múi giờ', `Billet đang dùng ${timezone}.`)
          return
        }
        Alert.alert(
          'Dùng múi giờ thiết bị?',
          `${profile?.settings.timezone ?? '…'} → ${timezone}`,
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Cập nhật', onPress: () => void saveQuickSetting({ timezone }) },
          ],
        )
      },
      value: profile?.settings.timezone ?? '…',
    },
  ]
  const progress = budget?.limitMinor
    ? Math.min(1, Number(budget.spentMinor) / Number(budget.limitMinor))
    : 0

  const saveQuickSetting = useCallback(
    async (patch: Parameters<typeof updateSettings>[1]) => {
      if (!token) return
      try {
        await updateSettings(token, patch)
        await refresh()
      } catch (reason) {
        Alert.alert(
          'Không thể cập nhật',
          reason instanceof Error ? reason.message : 'Vui lòng thử lại.',
        )
      }
    },
    [refresh, token],
  )

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

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
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.title}>Hồ sơ</Text>
        <AnimatedPressable
          accessibilityHint="Mở để chỉnh sửa thông tin hồ sơ"
          accessibilityRole="button"
          onPress={() => openSettings('profile')}
          style={[cardShadow, styles.identity, identityEntrance]}
        >
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
          <Feather color="#A0978D" name="chevron-right" size={18} />
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityHint="Mở để đặt hạn mức tháng"
          accessibilityRole="button"
          onPress={() => openSettings('budget')}
          style={[cardShadow, styles.budget, cardsEntrance]}
        >
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
        </AnimatedPressable>

        <View style={[cardShadow, styles.group]}>
          {settings.map((setting, index) => (
            <AnimatedPressable
              accessibilityRole="button"
              key={setting.label}
              onPress={setting.onPress}
              style={[styles.row, index < settings.length - 1 && styles.border]}
            >
              <Text style={styles.rowLabel}>{setting.label}</Text>
              <View style={styles.rowValue}>
                <Text style={styles.value}>{setting.value}</Text>
                <Feather color="#A0978D" name="chevron-down" size={18} />
              </View>
            </AnimatedPressable>
          ))}
        </View>

        <View style={[cardShadow, styles.group, styles.lastGroup]}>
          <AnimatedPressable
            accessibilityHint="Mở lịch nhắc chi tiết"
            accessibilityRole="button"
            onPress={() => openSettings('reminder')}
            style={[styles.row, styles.border]}
          >
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Nhắc ghi chép</Text>
              <Text style={styles.rowHint}>
                {profile?.settings.reminderEnabled
                  ? `Mỗi ngày lúc ${profile.settings.reminderTime ?? '20:00'}`
                  : 'Đang tắt'}
              </Text>
            </View>
            <Feather color="#A0978D" name="chevron-right" size={18} />
          </AnimatedPressable>
          <View style={[styles.row, styles.border]}>
            <Text style={styles.rowLabel}>Khóa bằng Face ID</Text>
            <Switch
              accessibilityLabel="Face ID"
              ios_backgroundColor="#DDD5C9"
              disabled={biometric.loading || !biometric.available}
              onValueChange={(value) => void biometric.setEnabled(value)}
              thumbColor="white"
              trackColor={{ false: '#DDD5C9', true: '#F2A183' }}
              value={biometric.enabled}
            />
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => openSettings('export')}
            style={[styles.row, styles.border]}
          >
            <Text style={styles.rowLabel}>Xuất dữ liệu</Text>
            <Feather color="#A0978D" name="chevron-right" size={18} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                'Billet · 0.1.0',
                'Nhật ký chi tiêu bằng hình ảnh — lưu lại khoảnh khắc trước, hiểu tiền bạc sau.',
              )
            }
            style={[styles.row, styles.border]}
          >
            <Text style={styles.rowLabel}>Về Billet</Text>
            <Feather color="#A0978D" name="info" size={18} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Đăng xuất khỏi Billet?', 'Bạn sẽ cần đăng nhập lại để xem nhật ký.', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: () => void logout() },
              ])
            }
            style={styles.row}
          >
            <Text style={styles.logout}>Đăng xuất</Text>
          </AnimatedPressable>
        </View>
        {!biometric.loading && !biometric.available ? (
          <Text style={styles.biometricHint}>
            Thiết bị chưa thiết lập sinh trắc nên khóa ứng dụng đang tắt.
          </Text>
        ) : null}
      </ScrollView>
      <BottomTabBar active="profile" />
    </SafeAreaView>
  )
}

function openSettings(section: string) {
  router.push(`/settings?section=${section}` as Href)
}

function presentChoice(
  title: string,
  choices: string[],
  selected: string | undefined,
  onSelect: (choice: string) => void,
) {
  const labels = choices.map((choice) => (choice === selected ? `${choice}  ✓` : choice))
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { cancelButtonIndex: choices.length, options: [...labels, 'Hủy'], title },
      (index) => {
        const choice = choices[index]
        if (choice) onSelect(choice)
      },
    )
    return
  }
  Alert.alert(
    title,
    undefined,
    [
      ...choices.map((choice) => ({
        text: choice === selected ? `${choice}  ✓` : choice,
        onPress: () => onSelect(choice),
      })),
      { text: 'Hủy', style: 'cancel' as const },
    ],
    { cancelable: true },
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
    minHeight: 148,
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
  biometricHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 26,
    marginTop: 8,
  },
  content: { paddingBottom: 116 },
  flex: { flex: 1 },
  logout: { color: '#B23B32', fontFamily: fonts.semibold, fontSize: 16 },
  moments: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginTop: 6 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  rowHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
  },
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
