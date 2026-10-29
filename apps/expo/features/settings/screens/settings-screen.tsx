/* oxlint-disable react/only-export-components, react/purity, react/set-state-in-effect */
import { Feather } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { API_BASE_URL, apiRequest } from '@/features/api/client'
import { localMonth } from '@/features/api/format'
import type {
  Budget,
  Category,
  ExportJob,
  Profile,
  Settings,
  SettingsOptions,
} from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import { CategoryFormModal } from '@/features/category/components/category-form-modal'
import { categoryIcon } from '@/features/category/category-options'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { deviceTimezone, updateSettings } from '../settings-api'
import { majorToMinor, minorToMajor } from '../settings-model'

type Section =
  | 'appearance'
  | 'budget'
  | 'categories'
  | 'currency'
  | 'export'
  | 'profile'
  | 'reminder'
  | 'timezone'
  | 'about'

const titles: Record<Section, string> = {
  appearance: 'Giao diện',
  budget: 'Ngân sách tháng',
  categories: 'Quản lý danh mục',
  currency: 'Tiền tệ mặc định',
  export: 'Xuất dữ liệu',
  profile: 'Thông tin hồ sơ',
  reminder: 'Nhắc ghi chép',
  timezone: 'Múi giờ',
  about: 'Về Billet',
}

export function SettingsScreen() {
  const { section: rawSection } = useLocalSearchParams<{ section?: string }>()
  const section: Section = isSection(rawSection) ? rawSection : 'about'
  const { token } = useSession()
  const load = useCallback(async (accessToken: string) => {
    const [profile, options] = await Promise.all([
      apiRequest<Profile>('/profile', { token: accessToken }),
      apiRequest<SettingsOptions>('/profile/settings/options', { token: accessToken }),
    ])
    return { options, profile }
  }, [])
  const resource = useApiResource(load)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = useCallback(
    async (patch: Parameters<typeof updateSettings>[1]) => {
      if (!token) return
      setSaving(true)
      setMessage(null)
      try {
        const settings = await updateSettings(token, patch)
        resource.setData((current) =>
          current ? { ...current, profile: { ...current.profile, settings } } : current,
        )
        setMessage('Đã lưu thay đổi')
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'Không thể lưu thay đổi')
      } finally {
        setSaving(false)
      }
    },
    [resource, token],
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather color={colors.text} name="x" size={22} />
        </AnimatedPressable>
        <Text style={styles.title}>{titles[section]}</Text>
        <View style={styles.back} />
      </View>
      {resource.loading && !resource.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.link} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {resource.error ? <InlineMessage text={resource.error} /> : null}
          {section === 'currency' ? (
            <CurrencySettings
              disabled={saving}
              onSave={save}
              options={resource.data?.options}
              settings={resource.data?.profile.settings}
            />
          ) : null}
          {section === 'appearance' ? (
            <AppearanceSettings
              disabled={saving}
              onSave={save}
              settings={resource.data?.profile.settings}
            />
          ) : null}
          {section === 'reminder' ? (
            <ReminderSettings
              disabled={saving}
              onSave={save}
              settings={resource.data?.profile.settings}
            />
          ) : null}
          {section === 'timezone' ? (
            <TimezoneSettings
              disabled={saving}
              onSave={save}
              settings={resource.data?.profile.settings}
            />
          ) : null}
          {section === 'budget' ? (
            <BudgetSettings
              currency={resource.data?.profile.settings.defaultCurrency ?? 'VND'}
              token={token}
            />
          ) : null}
          {section === 'categories' ? <CategorySettings token={token} /> : null}
          {section === 'export' ? (
            <ExportSettings
              currency={resource.data?.profile.settings.defaultCurrency ?? 'VND'}
              token={token}
            />
          ) : null}
          {section === 'profile' ? (
            <ProfileSettings profile={resource.data?.profile} token={token} />
          ) : null}
          {section === 'about' ? <AboutSettings /> : null}
          {message ? <InlineMessage text={message} /> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function CurrencySettings({
  disabled,
  onSave,
  options,
  settings,
}: {
  disabled: boolean
  onSave(patch: { defaultCurrency: string }): Promise<void>
  options?: SettingsOptions
  settings?: Settings
}) {
  return (
    <SettingsGroup>
      {(options?.currencies ?? ['VND']).map((currency) => (
        <ChoiceRow
          disabled={disabled}
          key={currency}
          label={currencyName(currency)}
          onPress={() => void onSave({ defaultCurrency: currency })}
          selected={settings?.defaultCurrency === currency}
          value={currency}
        />
      ))}
    </SettingsGroup>
  )
}

function AppearanceSettings({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean
  onSave(patch: { appearance: Settings['appearance'] }): Promise<void>
  settings?: Settings
}) {
  const choices: Array<[Settings['appearance'], string]> = [
    ['system', 'Theo hệ thống'],
    ['light', 'Sáng'],
    ['dark', 'Tối'],
  ]
  return (
    <SettingsGroup>
      {choices.map(([value, label]) => (
        <ChoiceRow
          disabled={disabled}
          key={value}
          label={label}
          onPress={() => {
            Appearance.setColorScheme(value === 'system' ? 'unspecified' : value)
            void onSave({ appearance: value })
          }}
          selected={settings?.appearance === value}
        />
      ))}
    </SettingsGroup>
  )
}

function ReminderSettings({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean
  onSave(patch: { reminderEnabled: boolean; reminderTime: string | null }): Promise<void>
  settings?: Settings
}) {
  const [enabled, setEnabled] = useState(settings?.reminderEnabled ?? false)
  const [time, setTime] = useState(settings?.reminderTime ?? '20:00')
  useEffect(() => {
    if (settings) {
      setEnabled(settings.reminderEnabled)
      setTime(settings.reminderTime ?? '20:00')
    }
  }, [settings])
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  return (
    <>
      <SettingsGroup>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Nhắc mỗi ngày</Text>
            <Text style={styles.rowHint}>Billet tạo một lời nhắc theo múi giờ tài khoản.</Text>
          </View>
          <Switch
            accessibilityLabel="Nhắc mỗi ngày"
            disabled={disabled}
            onValueChange={setEnabled}
            value={enabled}
          />
        </View>
      </SettingsGroup>
      {enabled ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Giờ nhắc (HH:mm)</Text>
          <TextInput
            accessibilityLabel="Giờ nhắc"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            textContentType="none"
            onChangeText={setTime}
            placeholder="20:00"
            style={styles.input}
            value={time}
          />
          <View style={styles.quickTimes}>
            {['08:00', '12:00', '20:00', '21:30'].map((value) => (
              <AnimatedPressable
                key={value}
                onPress={() => setTime(value)}
                style={[styles.chip, time === value && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{value}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      ) : null}
      <PrimaryButton
        disabled={disabled || (enabled && !valid)}
        label="Lưu lịch nhắc"
        onPress={() =>
          void onSave({ reminderEnabled: enabled, reminderTime: enabled ? time : null })
        }
      />
    </>
  )
}

function TimezoneSettings({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean
  onSave(patch: { timezone: string }): Promise<void>
  settings?: Settings
}) {
  const current = deviceTimezone()
  return (
    <>
      <SettingsGroup>
        <View style={styles.detailRow}>
          <Text style={styles.rowTitle}>Đang dùng</Text>
          <Text selectable style={styles.rowValue}>
            {settings?.timezone ?? '…'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.rowTitle}>Trên thiết bị</Text>
          <Text selectable style={styles.rowValue}>
            {current}
          </Text>
        </View>
      </SettingsGroup>
      <PrimaryButton
        disabled={disabled || settings?.timezone === current}
        label="Dùng múi giờ thiết bị"
        onPress={() => void onSave({ timezone: current })}
      />
    </>
  )
}

function BudgetSettings({ currency, token }: { currency: string; token: string | null }) {
  const load = useCallback(
    (accessToken: string) =>
      apiRequest<Budget>(`/budgets?month=${localMonth()}&currency=${currency}`, {
        token: accessToken,
      }),
    [currency],
  )
  const resource = useApiResource(load)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (resource.data?.limitMinor) setAmount(minorToMajor(resource.data.limitMinor, currency))
  }, [currency, resource.data?.limitMinor])
  const save = async () => {
    if (!token) return
    const limitMinor = majorToMinor(amount, currency)
    if (!limitMinor) return
    setSaving(true)
    try {
      resource.setData(
        await apiRequest('/budgets', {
          body: { month: localMonth(), currency, limitMinor },
          method: 'PUT',
          token,
        }),
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Hạn mức ({currency})</Text>
        <TextInput
          accessibilityLabel={`Hạn mức ${currency}`}
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder="0"
          style={styles.input}
          textContentType="none"
          value={amount}
        />
        <Text style={styles.rowHint}>
          Ngân sách chỉ áp dụng cho tháng {localMonth()} và không chặn ghi khoản chi mới.
        </Text>
      </View>
      <PrimaryButton
        disabled={saving || !majorToMinor(amount, currency)}
        label={resource.data?.isSet ? 'Cập nhật ngân sách' : 'Đặt ngân sách'}
        onPress={() => void save()}
      />
    </>
  )
}

function ExportSettings({ currency, token }: { currency: string; token: string | null }) {
  const load = useCallback(
    (accessToken: string) => apiRequest<ExportJob[]>('/exports?limit=10', { token: accessToken }),
    [],
  )
  const resource = useApiResource(load)
  const [creating, setCreating] = useState(false)
  const active = resource.data?.some(
    (job) => job.status === 'pending' || job.status === 'processing',
  )
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void resource.refresh(), 2000)
    return () => clearInterval(timer)
  }, [active, resource])
  const create = async () => {
    if (!token) return
    setCreating(true)
    try {
      await apiRequest('/exports', { body: { currency }, method: 'POST', token })
      await resource.refresh()
    } finally {
      setCreating(false)
    }
  }
  return (
    <>
      <Text style={styles.intro}>
        Tạo file CSV riêng tư cho các khoản chi bằng {currency}. File hoàn tất có hiệu lực trong 24
        giờ.
      </Text>
      <PrimaryButton
        disabled={creating || active}
        label={active ? 'Đang chuẩn bị…' : 'Tạo file CSV'}
        onPress={() => void create()}
      />
      <View style={styles.listGap}>
        {resource.data?.map((job) => (
          <ExportRow job={job} key={job.id} token={token} />
        ))}
      </View>
    </>
  )
}

function ProfileSettings({ profile, token }: { profile?: Profile; token: string | null }) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (profile) setDisplayName(profile.displayName)
  }, [profile])
  const save = async () => {
    if (!token || !displayName.trim()) return
    setSaving(true)
    try {
      await apiRequest('/profile', {
        body: { displayName: displayName.trim() },
        method: 'PATCH',
        token,
      })
      router.back()
    } catch (reason) {
      Alert.alert(
        'Không thể cập nhật hồ sơ',
        reason instanceof Error ? reason.message : 'Vui lòng thử lại',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Tên hiển thị</Text>
        <TextInput
          accessibilityLabel="Tên hiển thị"
          autoCapitalize="words"
          maxLength={100}
          onChangeText={setDisplayName}
          style={styles.input}
          textContentType="name"
          value={displayName}
        />
      </View>
      <SettingsGroup>
        <View style={styles.detailRow}>
          <Text style={styles.rowTitle}>Tên đăng nhập</Text>
          <Text selectable style={styles.rowValue}>
            @{profile?.username ?? '…'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.rowTitle}>Email</Text>
          <Text selectable style={styles.rowValue}>
            {profile?.email ?? '…'}
          </Text>
        </View>
      </SettingsGroup>
      <PrimaryButton
        disabled={saving || !displayName.trim() || displayName.trim() === profile?.displayName}
        label="Lưu hồ sơ"
        onPress={() => void save()}
      />
    </>
  )
}

function CategorySettings({ token }: { token: string | null }) {
  const load = useCallback(
    (accessToken: string) => apiRequest<Category[]>('/categories', { token: accessToken }),
    [],
  )
  const resource = useApiResource(load)
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const remove = (category: Category) => {
    if (category.usageCount > 0) {
      Alert.alert(
        'Danh mục đang được sử dụng',
        'Bạn có thể đổi tên, màu hoặc biểu tượng nhưng chưa thể xóa danh mục này.',
      )
      return
    }
    Alert.alert(
      'Xóa danh mục?',
      `“${category.name}” sẽ không còn xuất hiện khi ghi khoản chi mới.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (!token) return
            setDeletingId(category.id)
            try {
              await apiRequest(`/categories/${category.id}`, { method: 'DELETE', token })
              resource.setData(
                (current) => current?.filter((item) => item.id !== category.id) ?? current,
              )
            } catch (reason) {
              Alert.alert(
                'Không thể xóa danh mục',
                reason instanceof Error ? reason.message : 'Vui lòng thử lại.',
              )
            } finally {
              setDeletingId(null)
            }
          },
        },
      ],
    )
  }

  const saved = (category: Category) => {
    resource.setData((current) => {
      if (!current) return [category]
      const exists = current.some((item) => item.id === category.id)
      return exists
        ? current.map((item) => (item.id === category.id ? category : item))
        : [...current, category]
    })
    setEditing(null)
  }

  if (resource.loading && !resource.data) {
    return (
      <View style={styles.categoryLoading}>
        <ActivityIndicator color={colors.link} />
      </View>
    )
  }

  return (
    <>
      <Text style={styles.intro}>
        Billet tự đưa các danh mục bạn dùng nhiều lên đầu. Chỉ số sử dụng được giữ ẩn để danh sách
        luôn gọn.
      </Text>
      <PrimaryButton label="Thêm danh mục" onPress={() => setCreating(true)} />
      {resource.error ? (
        <AnimatedPressable accessibilityRole="button" onPress={() => void resource.refresh()}>
          <InlineMessage text={`${resource.error} · Thử lại`} />
        </AnimatedPressable>
      ) : null}
      <View style={styles.categoryList}>
        {resource.data?.map((category) => (
          <View key={category.id} style={styles.categoryRow}>
            <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
              <Feather color={colors.text} name={categoryIcon(category.icon)} size={21} />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {category.name}
              </Text>
              <Text style={styles.rowHint}>{category.isCustom ? 'Của bạn' : 'Mặc định'}</Text>
            </View>
            {category.isCustom ? (
              <View style={styles.categoryActions}>
                <AnimatedPressable
                  accessibilityLabel={`Sửa ${category.name}`}
                  accessibilityRole="button"
                  onPress={() => setEditing(category)}
                  style={styles.categoryAction}
                >
                  <Feather color={colors.link} name="edit-2" size={18} />
                </AnimatedPressable>
                <AnimatedPressable
                  accessibilityLabel={`Xóa ${category.name}`}
                  accessibilityRole="button"
                  disabled={deletingId === category.id}
                  onPress={() => remove(category)}
                  style={styles.categoryAction}
                >
                  {deletingId === category.id ? (
                    <ActivityIndicator color="#B3433C" size="small" />
                  ) : (
                    <Feather color="#B3433C" name="trash-2" size={18} />
                  )}
                </AnimatedPressable>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <CategoryFormModal
        category={editing}
        onDismiss={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={saved}
        visible={creating || Boolean(editing)}
      />
    </>
  )
}

function ExportRow({ job, token }: { job: ExportJob; token: string | null }) {
  const downloadable =
    job.status === 'succeeded' &&
    job.downloadExpiresAt &&
    new Date(job.downloadExpiresAt) > new Date()
  return (
    <View style={styles.exportCard}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>
          {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(job.createdAt),
          )}
        </Text>
        <Text style={styles.rowHint}>{exportStatus(job)}</Text>
      </View>
      {downloadable ? (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => void downloadExport(job, token)}
          style={styles.download}
        >
          <Feather color={colors.link} name="download" size={20} />
        </AnimatedPressable>
      ) : null}
    </View>
  )
}

function AboutSettings() {
  return (
    <View style={styles.about}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>B</Text>
      </View>
      <Text style={styles.aboutTitle}>Billet</Text>
      <Text style={styles.intro}>
        Nhật ký chi tiêu bằng hình ảnh — lưu lại khoảnh khắc trước, hiểu tiền bạc sau.
      </Text>
      <Text selectable style={styles.version}>
        Phiên bản {Constants.expoConfig?.version ?? '0.1.0'}
      </Text>
    </View>
  )
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>
}
function ChoiceRow({
  disabled,
  label,
  onPress,
  selected,
  value,
}: {
  disabled?: boolean
  label: string
  onPress(): void
  selected: boolean
  value?: string
}) {
  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      disabled={disabled}
      onPress={onPress}
      style={styles.choiceRow}
    >
      <View>
        <Text style={styles.rowTitle}>{label}</Text>
        {value ? <Text style={styles.rowHint}>{value}</Text> : null}
      </View>
      {selected ? <Feather color={colors.link} name="check" size={21} /> : null}
    </AnimatedPressable>
  )
}
function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean
  label: string
  onPress(): void
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.primary}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </AnimatedPressable>
  )
}
function InlineMessage({ text }: { text: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.message}>
      {text}
    </Text>
  )
}

function isSection(value: string | undefined): value is Section {
  return Boolean(value && value in titles)
}
function currencyName(value: string) {
  return (
    (
      { VND: 'Việt Nam đồng', USD: 'Đô la Mỹ', EUR: 'Euro', JPY: 'Yên Nhật' } as Record<
        string,
        string
      >
    )[value] ?? value
  )
}
function exportStatus(job: ExportJob) {
  if (job.status === 'succeeded')
    return job.downloadExpiresAt && new Date(job.downloadExpiresAt) > new Date()
      ? 'Sẵn sàng tải xuống'
      : 'Đã hết hạn'
  if (job.status === 'failed') return job.failureReason ?? 'Xuất dữ liệu thất bại'
  if (job.status === 'canceled') return 'Đã hủy'
  return 'Đang chuẩn bị file'
}
async function downloadExport(job: ExportJob, token: string | null) {
  if (!token) return
  try {
    const url = `${API_BASE_URL}/exports/${job.id}/download`
    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Không thể tải file')
      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `billet-export-${job.id}.csv`
      anchor.click()
      URL.revokeObjectURL(objectUrl)
      return
    }
    const uri = `${FileSystem.cacheDirectory}billet-export-${job.id}.csv`
    await FileSystem.downloadAsync(url, uri, { headers: { Authorization: `Bearer ${token}` } })
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Lưu dữ liệu Billet' })
    else Alert.alert('Đã tải file', uri)
  } catch (reason) {
    Alert.alert('Không thể tải file', reason instanceof Error ? reason.message : 'Vui lòng thử lại')
  }
}

const styles = StyleSheet.create({
  about: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 44 },
  aboutTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 28, marginTop: 16 },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  categoryAction: { alignItems: 'center', height: 44, justifyContent: 'center', width: 40 },
  categoryActions: { flexDirection: 'row' },
  categoryIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  categoryList: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  categoryLoading: { alignItems: 'center', minHeight: 180, justifyContent: 'center' },
  categoryRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
  },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: { backgroundColor: colors.peachSoft },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  choiceRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  content: { gap: 16, padding: 16, paddingBottom: 44 },
  detailRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 62,
    padding: 16,
  },
  download: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  exportCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    minHeight: 76,
    padding: 14,
  },
  fieldGroup: { backgroundColor: colors.card, borderRadius: 18, gap: 10, padding: 18 },
  fieldLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  flex: { flex: 1 },
  group: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 8,
  },
  input: {
    backgroundColor: colors.chip,
    borderRadius: 12,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 20,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  intro: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  listGap: { gap: 10 },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 28,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoText: { color: colors.text, fontFamily: fonts.amount, fontSize: 36 },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  quickTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  rowTitle: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  rowValue: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 78, padding: 16 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  version: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14, marginTop: 24 },
})
