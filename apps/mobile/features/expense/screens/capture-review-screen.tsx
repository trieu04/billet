import { Feather } from '@expo/vector-icons'
import { type Href, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CategoryChips } from '@/features/expense/components/category-chips'
import { ExpenseTicket } from '@/features/expense/components/expense-ticket'
import { Receipt } from '@/features/expense/components/receipt'
import { colors, fonts } from '@/features/ui/theme'

const details = [
  ['shopping-bag', 'Cửa hàng', 'Thêm cửa hàng'],
  ['users', 'Bạn bè', 'Thêm bạn bè'],
  ['clock', 'Thời gian', 'Hôm nay, 08:42'],
  ['map-pin', 'Địa điểm', 'Thêm địa điểm'],
] as const

export function CaptureReviewScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>()
  const [category, setCategory] = useState<string>('Cà phê')
  const [caption, setCaption] = useState('')
  const [expanded, setExpanded] = useState(false)
  const save = () =>
    router.replace({
      pathname: '/expense',
      params: { imageUri, category: category ?? 'Cà phê', caption },
    } as Href)

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {!expanded ? (
        <>
          <View style={styles.top}>
            <Pressable accessibilityLabel="Đóng" onPress={() => router.back()} style={styles.close}>
              <Feather color="white" name="x" size={22} />
            </Pressable>
            <View style={styles.statusPill}>
              <Feather color={colors.greenText} name="check" size={15} />
              <Text style={styles.statusText}>Đã đọc xong</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.preview}>
            <View style={styles.rotated}>
              <ExpenseTicket
                compact
                imageUri={imageUri}
                meta="Hôm nay · 08:42"
                store="Khoản chi mới"
              />
            </View>
            <Text style={styles.previewHint}>Xem trước trong Journal</Text>
          </View>
        </>
      ) : (
        <View style={styles.compactHeader}>
          <Pressable accessibilityLabel="Đóng" onPress={() => router.back()} style={styles.close}>
            <Feather color="white" name="x" size={22} />
          </Pressable>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <Receipt height={70} rotation="3deg" width={49} />
            </View>
          )}
          <View>
            <Text style={styles.heroLabel}>KHOẢN CHI MỚI</Text>
            <Text style={styles.heroMeta}>Hôm nay · 08:42</Text>
          </View>
        </View>
      )}
      <View style={[styles.sheet, expanded && styles.sheetExpanded]}>
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>SỐ TIỀN</Text>
            {!expanded ? <Text style={styles.editHint}>Chạm để sửa</Text> : null}
          </View>
          <Text style={styles.amount}>58.000₫</Text>
          <CategoryChips
            onAdd={() => setCategory('Khác')}
            onSelect={setCategory}
            selected={category}
          />
          <View style={styles.captionWrap}>
            <Feather color="#A0978D" name="edit-2" size={17} />
            <TextInput
              accessibilityLabel="Caption"
              multiline
              onChangeText={setCaption}
              placeholder="Viết caption cho khoảnh khắc này…"
              placeholderTextColor="#B5ADA4"
              style={styles.caption}
              value={caption}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((value) => !value)}
            style={styles.detailsHeader}
          >
            <View style={styles.detailsCopy}>
              <View style={styles.detailsIcon}>
                <Feather color={colors.text} name="sliders" size={15} />
              </View>
              <View>
                <Text style={styles.detailsTitle}>Chi tiết</Text>
                {!expanded ? (
                  <Text style={styles.detailsHint}>Thêm cửa hàng, bạn bè, địa điểm…</Text>
                ) : null}
              </View>
            </View>
            <Feather
              color={colors.textSecondary}
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={21}
            />
          </Pressable>
          {expanded ? (
            <View style={styles.details}>
              {details.map(([icon, label, value], index) => (
                <Pressable
                  accessibilityRole="button"
                  key={label}
                  style={[styles.detailRow, index < details.length - 1 && styles.border]}
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
          <Pressable accessibilityRole="button" onPress={save} style={styles.primary}>
            <Text style={styles.primaryText}>Lưu vào Journal</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
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
    marginTop: -8,
  },
  amountHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
  amountLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 12 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  caption: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 54,
    paddingVertical: 14,
  },
  captionWrap: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
  },
  close: {
    alignItems: 'center',
    backgroundColor: '#484440',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  compactHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    marginHorizontal: 20,
    marginTop: 8,
  },
  detailsCopy: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  detailsIcon: {
    alignItems: 'center',
    backgroundColor: '#FADCCB',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
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
    minHeight: 66,
    paddingHorizontal: 16,
  },
  detailsHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
  },
  detailsTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  form: { gap: 12, paddingBottom: 20 },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#DDD5C9',
    borderRadius: 3,
    height: 5,
    marginBottom: 10,
    marginTop: 8,
    width: 36,
  },
  heroFallback: {
    alignItems: 'center',
    backgroundColor: colors.butter,
    borderRadius: 12,
    height: 90,
    justifyContent: 'center',
    width: 72,
  },
  heroImage: { borderRadius: 12, height: 90, width: 72 },
  heroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  heroMeta: { color: 'white', fontFamily: fonts.medium, fontSize: 13, marginTop: 5 },
  placeholder: { width: 40 },
  preview: { alignItems: 'center', height: 320, justifyContent: 'center' },
  previewHint: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 13,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  primaryText: { color: '#3A1D0E', fontFamily: fonts.semibold, fontSize: 16 },
  rotated: { transform: [{ rotate: '-3deg' }], width: 250 },
  safe: { backgroundColor: colors.camera, flex: 1 },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    bottom: 0,
    height: 417,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sheetExpanded: { height: 690 },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
  },
  editHint: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12 },
  statusPill: {
    alignItems: 'center',
    backgroundColor: colors.sage,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    height: 32,
    paddingHorizontal: 13,
  },
  statusText: { color: colors.greenText, fontFamily: fonts.semibold, fontSize: 13 },
})
