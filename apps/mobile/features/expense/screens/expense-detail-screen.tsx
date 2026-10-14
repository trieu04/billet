import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CategoryChips } from '@/features/expense/components/category-chips'
import { Receipt } from '@/features/expense/components/receipt'
import { colors, fonts } from '@/features/ui/theme'

const detailRows = [
  ['shopping-bag', 'Cửa hàng', 'Highlands Coffee'],
  ['users', 'Bạn bè', 'Lan, Hùng'],
  ['clock', 'Thời gian', 'Hôm nay, 08:42'],
  ['map-pin', 'Địa điểm', 'Hoàn Kiếm, Hà Nội'],
] as const

export function ExpenseDetailScreen() {
  const params = useLocalSearchParams<{ imageUri?: string; category?: string; caption?: string }>()
  const [expanded, setExpanded] = useState(false)
  const [category, setCategory] = useState(params.category ?? 'Cà phê')
  const [caption, setCaption] = useState(params.caption || 'Cà phê muối buổi sáng')
  const remove = () =>
    Alert.alert('Xóa khoản chi?', 'Khoản chi này sẽ bị xóa khỏi Journal.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => router.replace('/') },
    ])

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Feather color={colors.link} name="chevron-left" size={23} />
          <Text style={styles.navAction}>Journal</Text>
        </Pressable>
        <Text style={styles.navTitle}>Chi tiết</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')}>
          <Text style={[styles.navAction, styles.done]}>Xong</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!expanded ? (
          <Photo imageUri={params.imageUri} large />
        ) : (
          <View style={styles.compactHero}>
            <Photo imageUri={params.imageUri} />
            <View>
              <Text style={styles.amountLabel}>SỐ TIỀN</Text>
              <Text style={styles.compactAmount}>58.000₫</Text>
              <Text style={styles.meta}>Hôm nay · 08:42</Text>
            </View>
          </View>
        )}
        {!expanded ? <Text style={styles.amount}>58.000₫</Text> : null}
        <CategoryChips
          onAdd={() => setCategory('Khác')}
          onSelect={setCategory}
          selected={category}
        />
        <TextInput
          accessibilityLabel="Caption"
          multiline
          onChangeText={setCaption}
          style={styles.caption}
          value={caption}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
          style={styles.detailsHeader}
        >
          <View>
            <Text style={styles.detailsTitle}>Chi tiết</Text>
            {!expanded ? (
              <Text numberOfLines={1} style={styles.detailsHint}>
                Highlands Coffee · Hoàn Kiếm · 08:42
              </Text>
            ) : null}
          </View>
          <Feather
            color={colors.textSecondary}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={21}
          />
        </Pressable>
        {expanded ? (
          <View style={styles.details}>
            {detailRows.map(([icon, label, value], index) => (
              <Pressable
                accessibilityRole="button"
                key={label}
                style={[styles.detailRow, index < detailRows.length - 1 && styles.border]}
              >
                <View style={styles.detailLabel}>
                  <Feather color={colors.textSecondary} name={icon} size={18} />
                  <Text style={styles.detailLabelText}>{label}</Text>
                </View>
                <View style={styles.detailValue}>
                  <Text style={styles.detailValueText}>{value}</Text>
                  <Feather color="#A0978D" name="chevron-right" size={18} />
                </View>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" style={styles.addField}>
              <Feather color={colors.link} name="plus" size={17} />
              <Text style={styles.addFieldText}>Thêm trường khác</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.autosave}>
          <Feather color={colors.textSecondary} name="check" size={14} />
          <Text style={styles.autosaveText}>Mọi thay đổi được tự động lưu</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
          <Text style={styles.deleteText}>Xóa khoản chi</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function Photo({ imageUri, large = false }: { imageUri?: string; large?: boolean }) {
  if (imageUri)
    return (
      <Image
        accessibilityLabel="Ảnh khoản chi"
        source={{ uri: imageUri }}
        style={large ? styles.photoLarge : styles.photoSmall}
      />
    )
  return (
    <LinearGradient
      colors={[colors.sage, colors.butter]}
      end={{ x: 1, y: 1 }}
      style={large ? styles.photoLarge : styles.photoSmall}
    >
      <Receipt height={large ? 215 : 72} rotation="3deg" width={large ? 158 : 52} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  addField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    height: 48,
    paddingHorizontal: 16,
  },
  addFieldText: { color: colors.link, fontFamily: fonts.medium, fontSize: 14 },
  amount: {
    color: colors.text,
    fontFamily: fonts.amount,
    fontSize: 44,
    letterSpacing: -1,
    marginHorizontal: 20,
    textAlign: 'center',
  },
  amountLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  autosave: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center' },
  autosaveText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  back: { alignItems: 'center', flexDirection: 'row' },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  caption: {
    backgroundColor: colors.chip,
    borderRadius: 16,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    marginHorizontal: 20,
    minHeight: 52,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  compactAmount: { color: colors.text, fontFamily: fonts.amount, fontSize: 36, letterSpacing: -1 },
  compactHero: { alignItems: 'center', flexDirection: 'row', gap: 16, marginHorizontal: 20 },
  content: { gap: 12, paddingBottom: 28 },
  delete: { alignItems: 'center', height: 40, justifyContent: 'center' },
  deleteText: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 15 },
  detailLabel: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  detailLabelText: { color: colors.text, fontFamily: fonts.regular, fontSize: 14 },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  detailValue: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  detailValueText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  details: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  detailsHeader: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    minHeight: 62,
    paddingHorizontal: 16,
  },
  detailsHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
    maxWidth: 280,
  },
  detailsTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  done: { fontFamily: fonts.semibold },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 42,
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  navAction: { color: colors.link, fontFamily: fonts.regular, fontSize: 16 },
  navTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  photoLarge: {
    alignItems: 'center',
    borderRadius: 26,
    height: 280,
    justifyContent: 'center',
    marginHorizontal: 16,
    overflow: 'hidden',
    width: 'auto',
  },
  photoSmall: {
    alignItems: 'center',
    borderRadius: 12,
    height: 90,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  safe: { backgroundColor: colors.canvas, flex: 1 },
})
