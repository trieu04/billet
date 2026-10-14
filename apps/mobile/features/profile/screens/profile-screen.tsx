import { Feather } from '@expo/vector-icons'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { cardShadow } from '@/features/ui/card'
import { colors, fonts } from '@/features/ui/theme'

const settings = [
  { label: 'Tiền tệ', value: 'VND ₫' },
  { label: 'Nhắc ghi chép', value: '21:00' },
  { label: 'Giao diện', value: 'Tự động' },
] as const

export function ProfileScreen() {
  const [faceIdEnabled, setFaceIdEnabled] = useState(true)

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={styles.title}>Hồ sơ</Text>
      <View style={[cardShadow, styles.identity]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>Minh Anh</Text>
          <Text style={styles.moments}>Đã lưu 214 khoảnh khắc</Text>
        </View>
        <Feather color={colors.textSecondary} name="chevron-right" size={20} />
      </View>
      <View style={[cardShadow, styles.budget]}>
        <Text style={styles.sectionLabel}>Ngân sách tháng 10</Text>
        <Text style={styles.budgetAmount}>
          3.840.000₫ <Text style={styles.budgetLimit}>/ 6.000.000₫</Text>
        </Text>
        <View style={styles.track}>
          <View style={styles.progress} />
        </View>
        <Text style={styles.budgetHint}>Còn 2.160.000₫ cho 17 ngày</Text>
      </View>
      <View style={[cardShadow, styles.group]}>
        {settings.map((setting, index) => (
          <Pressable
            accessibilityRole="button"
            key={setting.label}
            onPress={() => Alert.alert(setting.label, `Đang dùng ${setting.value}`)}
            style={[styles.row, index < settings.length - 1 && styles.border]}
          >
            <Text style={styles.rowLabel}>{setting.label}</Text>
            <View style={styles.rowValue}>
              <Text style={styles.value}>{setting.value}</Text>
              <Feather color="#A0978D" name="chevron-right" size={19} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={[cardShadow, styles.group, styles.lastGroup]}>
        <View style={[styles.row, styles.border]}>
          <Text style={styles.rowLabel}>Khóa bằng Face ID</Text>
          <Switch
            accessibilityLabel="Face ID"
            onValueChange={setFaceIdEnabled}
            ios_backgroundColor="#DDD5C9"
            trackColor={{ false: '#DDD5C9', true: '#F2A183' }}
            value={faceIdEnabled}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Xuất dữ liệu', 'Dữ liệu của bạn đang được chuẩn bị.')}
          style={[styles.row, styles.border]}
        >
          <Text style={styles.rowLabel}>Xuất dữ liệu</Text>
          <Feather color="#A0978D" name="chevron-right" size={19} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Billet', 'Phiên bản 1.0')}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Về Billet</Text>
          <View style={styles.rowValue}>
            <Text style={styles.value}>v1.0</Text>
            <Feather color="#A0978D" name="chevron-right" size={19} />
          </View>
        </Pressable>
      </View>
      <BottomTabBar active="profile" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F0DCD6',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: '#6E3521', fontFamily: fonts.bold, fontSize: 22 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  budget: { borderRadius: 22, marginHorizontal: 16, marginTop: 6, padding: 18 },
  budgetAmount: { color: colors.text, fontFamily: fonts.amount, fontSize: 24, marginTop: 7 },
  budgetHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 9,
  },
  budgetLimit: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 14 },
  group: { borderRadius: 22, marginHorizontal: 16, marginTop: 18, overflow: 'hidden' },
  identity: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 7,
    padding: 16,
  },
  identityText: { flex: 1, marginLeft: 13 },
  lastGroup: { marginTop: 20 },
  moments: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, marginTop: 3 },
  name: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
  progress: { backgroundColor: colors.peach, borderRadius: 4, height: 8, width: '64%' },
  row: {
    alignItems: 'center',
    backgroundColor: colors.card,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingHorizontal: 17,
  },
  rowLabel: { color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  rowValue: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  sectionLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0,
    textTransform: 'none',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginHorizontal: 20,
    marginTop: 20,
  },
  track: {
    backgroundColor: '#EAE2D7',
    borderRadius: 4,
    height: 8,
    marginTop: 13,
    overflow: 'hidden',
  },
  value: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
})
