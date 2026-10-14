import { Feather } from '@expo/vector-icons'
import { type Href, router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ExpenseTicket } from '@/features/expense/components/expense-ticket'
import { JournalViewToggle } from '@/features/journal/components/journal-view-toggle'
import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { colors, fonts } from '@/features/ui/theme'

export function JournalScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.date}>Thứ Tư, 14 tháng 10</Text>
            <Text style={styles.title}>Hôm nay</Text>
          </View>
          <JournalViewToggle active="timeline" />
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.label}>Đã chi hôm nay</Text>
          <Text style={styles.total}>248.000₫</Text>
          <View style={styles.split}>
            <View style={[styles.segment, styles.food]} />
            <View style={[styles.segment, styles.travel]} />
            <View style={[styles.segment, styles.other]} />
          </View>
          <View style={styles.legend}>
            <Text style={styles.caption}>Ăn uống</Text>
            <Text style={styles.caption}>Đi lại</Text>
            <Text style={styles.caption}>Khác</Text>
            <Text style={styles.caption}>3 khoản</Text>
          </View>
        </View>
        <Text style={styles.overline}>KHOẢNH KHẮC</Text>
        <ExpenseTicket onPress={() => router.push('/expense' as Href)} />
        <ExpenseTicket
          amount="95.000₫"
          meta="12:15 · Bữa trưa"
          store="Bún chả Hương Liên"
          variant="peach"
        />
      </ScrollView>
      <Pressable
        accessibilityLabel="Chụp ngay"
        accessibilityRole="button"
        onPress={() => router.push('/capture' as Href)}
        style={styles.capture}
      >
        <Feather color="#3A1D0E" name="camera" size={23} />
        <Text style={styles.captureText}>Chụp ngay</Text>
      </Pressable>
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
  content: { gap: 20, paddingBottom: 190, paddingHorizontal: 16, paddingTop: 13 },
  date: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, marginLeft: 4 },
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
    marginBottom: -8,
    marginLeft: 4,
    marginTop: 14,
  },
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
