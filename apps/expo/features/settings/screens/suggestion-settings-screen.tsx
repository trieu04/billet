/* oxlint-disable react/set-state-in-effect */
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ApiError, apiRequest } from '@/features/api/client'
import type { Category, DecisionChoice, ExpenseRule, Profile, Settings } from '@/features/api/types'
import { useApiResource } from '@/features/api/use-api-resource'
import { useSession } from '@/features/auth/session'
import {
  getLocationPermission,
  isOcrAvailable,
  type LocationPermission,
  useRefreshSuggestionSnapshot,
} from '@/features/suggestion'
import { AnimatedPressable } from '@/features/ui/motion'
import { colors, fonts } from '@/features/ui/theme'

import { type SettingsPatch, updateSettings } from '../settings-api'
import {
  createDecisionChoice,
  createExpenseRule,
  deleteDecisionChoice,
  deleteExpenseRule,
  listDecisionChoices,
  listExpenseRules,
  updateDecisionChoice,
  updateExpenseRule,
} from '../suggestion-api'
import {
  describeActions,
  describeConditions,
  formToRuleInput,
  IMAGE_TYPE_LABELS,
  imageTypeLabel,
  originLabel,
  type RuleForm,
  ruleToForm,
} from '../suggestion-settings-model'

type SuggestionData = {
  settings: Settings
  choices: DecisionChoice[]
  rules: ExpenseRule[]
  categories: Category[]
}

const CONFLICT_MESSAGE = 'Mục này vừa được thay đổi ở nơi khác. Billet đã tải lại danh sách.'

export function SuggestionSettingsScreen() {
  const { token } = useSession()
  const refreshSnapshot = useRefreshSuggestionSnapshot()
  const load = useCallback(async (accessToken: string): Promise<SuggestionData> => {
    const [profile, choices, rules, categories] = await Promise.all([
      apiRequest<Profile>('/profile', { token: accessToken }),
      listDecisionChoices(accessToken),
      listExpenseRules(accessToken),
      apiRequest<Category[]>('/categories', { token: accessToken }),
    ])
    return { settings: profile.settings, choices, rules, categories }
  }, [])
  const resource = useApiResource(load)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState<LocationPermission | null>(null)
  const [choiceForm, setChoiceForm] = useState<{ choice: DecisionChoice | null } | null>(null)
  const [ruleForm, setRuleForm] = useState<{ rule: ExpenseRule | null } | null>(null)

  useEffect(() => {
    void getLocationPermission().then(setPermission)
  }, [])

  const data = resource.data
  const imageTypes = data?.choices.filter((item) => item.kind === 'image_type') ?? []
  const personalChoices = data?.choices.filter((item) => item.kind === 'personal') ?? []
  const accountRules = data?.rules.filter((item) => item.origin !== 'default') ?? []

  const afterChange = useCallback(() => {
    void refreshSnapshot()
  }, [refreshSnapshot])

  /** Shows the error; a 409 on an update means a stale version, so the list is reloaded. */
  const handleError = useCallback(
    async (reason: unknown, fallback: string) => {
      if (reason instanceof ApiError && reason.status === 409) {
        await resource.refresh()
        setMessage(CONFLICT_MESSAGE)
        return
      }
      setMessage(reason instanceof Error ? reason.message : fallback)
    },
    [resource],
  )

  const saveSetting = async (patch: SettingsPatch) => {
    if (!token || !data) return
    setBusy(true)
    setMessage(null)
    resource.setData((current) =>
      current ? { ...current, settings: { ...current.settings, ...patch } } : current,
    )
    try {
      const settings = await updateSettings(token, patch)
      resource.setData((current) => (current ? { ...current, settings } : current))
      afterChange()
    } catch (reason) {
      resource.setData((current) => (current ? { ...current, settings: data.settings } : current))
      setMessage(reason instanceof Error ? reason.message : 'Không thể lưu thay đổi')
    } finally {
      setBusy(false)
    }
  }

  const replaceChoice = (choice: DecisionChoice) =>
    resource.setData((current) =>
      current
        ? {
            ...current,
            choices: current.choices.some((item) => item.id === choice.id)
              ? current.choices.map((item) => (item.id === choice.id ? choice : item))
              : [...current.choices, choice],
          }
        : current,
    )

  const replaceRule = (rule: ExpenseRule) =>
    resource.setData((current) =>
      current
        ? {
            ...current,
            rules: current.rules.some((item) => item.id === rule.id)
              ? current.rules.map((item) => (item.id === rule.id ? rule : item))
              : [...current.rules, rule],
          }
        : current,
    )

  const toggleChoice = async (choice: DecisionChoice, enabled: boolean) => {
    if (!token) return
    setBusy(true)
    setMessage(null)
    try {
      replaceChoice(
        await updateDecisionChoice(token, choice, { status: enabled ? 'enabled' : 'disabled' }),
      )
      afterChange()
    } catch (reason) {
      await handleError(reason, 'Không thể cập nhật lựa chọn')
    } finally {
      setBusy(false)
    }
  }

  const toggleRule = async (rule: ExpenseRule, enabled: boolean) => {
    if (!token) return
    setBusy(true)
    setMessage(null)
    try {
      replaceRule(
        await updateExpenseRule(token, rule, { status: enabled ? 'enabled' : 'disabled' }),
      )
      afterChange()
    } catch (reason) {
      await handleError(reason, 'Không thể cập nhật quy tắc')
    } finally {
      setBusy(false)
    }
  }

  const removeChoice = (choice: DecisionChoice) =>
    confirmDestructive(
      'Xóa lựa chọn?',
      choice.origin === 'learned'
        ? `“${choice.label}” sẽ bị xóa và Billet không tự học lại trong 90 ngày.`
        : `“${choice.label}” sẽ không còn được gợi ý.`,
      async () => {
        if (!token) return
        setBusy(true)
        try {
          await deleteDecisionChoice(token, choice.id)
          resource.setData((current) =>
            current
              ? { ...current, choices: current.choices.filter((item) => item.id !== choice.id) }
              : current,
          )
          afterChange()
        } catch (reason) {
          await handleError(reason, 'Không thể xóa lựa chọn')
        } finally {
          setBusy(false)
        }
      },
    )

  const removeRule = (rule: ExpenseRule) =>
    confirmDestructive(
      'Xóa quy tắc?',
      rule.origin === 'learned'
        ? 'Quy tắc sẽ bị xóa và Billet không tự học lại trong 90 ngày.'
        : 'Quy tắc sẽ không còn điền giá trị khi chụp ảnh.',
      async () => {
        if (!token) return
        setBusy(true)
        try {
          await deleteExpenseRule(token, rule.id)
          resource.setData((current) =>
            current
              ? { ...current, rules: current.rules.filter((item) => item.id !== rule.id) }
              : current,
          )
          afterChange()
        } catch (reason) {
          await handleError(reason, 'Không thể xóa quy tắc')
        } finally {
          setBusy(false)
        }
      },
    )

  const settings = data?.settings
  const locationHint = (() => {
    if (Platform.OS === 'web') return 'Trình duyệt không dùng vị trí cho gợi ý.'
    if (permission?.granted) return 'Billet đã có quyền vị trí khi dùng ứng dụng.'
    return 'Billet không xin quyền vị trí chỉ để gợi ý. Khi chưa có quyền, gợi ý không dùng vị trí.'
  })()

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather color={colors.text} name="chevron-left" size={24} />
        </AnimatedPressable>
        <Text accessibilityRole="header" style={styles.title}>
          Gợi ý tự động
        </Text>
        <View style={styles.back} />
      </View>
      {resource.loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.link} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {resource.error ? (
            <AnimatedPressable accessibilityRole="button" onPress={() => void resource.refresh()}>
              <InlineMessage text={`${resource.error} · Thử lại`} />
            </AnimatedPressable>
          ) : null}
          {message ? <InlineMessage text={message} /> : null}

          <View style={styles.group}>
            <ToggleRow
              disabled={busy || !settings}
              hint="Đọc hóa đơn ngay trên máy và gửi một ảnh thu nhỏ để gợi ý loại ảnh, danh mục. Tắt thì Billet không gửi ảnh để gợi ý."
              label="Gợi ý từ ảnh"
              onChange={(value) => void saveSetting({ suggestionsEnabled: value })}
              value={settings?.suggestionsEnabled ?? false}
            />
            <ToggleRow
              disabled={busy || !settings}
              hint="Tạo lựa chọn và quy tắc từ các khoản chi bạn đã lưu."
              label="Học từ lịch sử"
              onChange={(value) => void saveSetting({ ruleLearningEnabled: value })}
              value={settings?.ruleLearningEnabled ?? false}
            />
            <ToggleRow
              disabled={busy || !settings}
              hint={`Dùng vị trí gần đúng (khoảng 150 m) để nhận ra nơi quen. ${locationHint}`}
              label="Dùng vị trí"
              last
              onChange={(value) => void saveSetting({ suggestionLocationEnabled: value })}
              value={settings?.suggestionLocationEnabled ?? false}
            />
          </View>
          {Platform.OS !== 'web' && permission && !permission.granted && !permission.canAskAgain ? (
            <AnimatedPressable
              accessibilityHint="Mở Cài đặt để cấp quyền vị trí cho Billet"
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Mở Cài đặt</Text>
            </AnimatedPressable>
          ) : null}
          {!isOcrAvailable() ? (
            <Text style={styles.note}>
              Bản ứng dụng này không có nhận dạng chữ trên máy (Expo Go hoặc web), nên chỉ dùng gợi
              ý từ máy chủ và quy tắc.
            </Text>
          ) : null}

          <SectionHeader
            actionLabel="Thêm lựa chọn"
            disabled={busy || !data}
            onAction={() => setChoiceForm({ choice: null })}
            title="Lựa chọn cá nhân"
          />
          <Text style={styles.note}>
            Những thứ bạn hay chụp, ví dụ “Gửi xe – Tòa A”. Billet chọn giúp khi nhận ra ảnh.
          </Text>
          {personalChoices.length === 0 ? (
            <Text style={styles.empty}>Chưa có lựa chọn nào.</Text>
          ) : (
            <View style={styles.group}>
              {personalChoices.map((choice, index) => (
                <ItemRow
                  disabled={busy}
                  enabled={choice.status === 'enabled'}
                  key={choice.id}
                  last={index === personalChoices.length - 1}
                  meta={[
                    originLabel(choice.origin),
                    choice.imageType ? imageTypeLabel(choice.imageType, imageTypes) : null,
                    choice.support > 0 ? `${choice.support} lần` : null,
                  ]}
                  onDelete={() => removeChoice(choice)}
                  onEdit={() => setChoiceForm({ choice })}
                  onToggle={(value) => void toggleChoice(choice, value)}
                  title={choice.label}
                />
              ))}
            </View>
          )}

          <SectionHeader
            actionLabel="Thêm quy tắc"
            disabled={busy || !data}
            onAction={() => setRuleForm({ rule: null })}
            title="Quy tắc"
          />
          <Text style={styles.note}>
            Quy tắc điền số tiền, danh mục hoặc cửa hàng khi ảnh khớp điều kiện.
          </Text>
          {accountRules.length === 0 ? (
            <Text style={styles.empty}>Chưa có quy tắc nào.</Text>
          ) : (
            <View style={styles.group}>
              {accountRules.map((rule, index) => (
                <ItemRow
                  disabled={busy}
                  enabled={rule.status === 'enabled'}
                  key={rule.id}
                  last={index === accountRules.length - 1}
                  meta={[
                    describeActions(rule.actions, data?.categories ?? []),
                    originLabel(rule.origin),
                    rule.origin === 'learned' ? `${Math.round(rule.confidence * 100)}%` : null,
                  ]}
                  onDelete={() => removeRule(rule)}
                  onEdit={() => setRuleForm({ rule })}
                  onToggle={(value) => void toggleRule(rule, value)}
                  title={describeConditions(rule.conditions, {
                    choices: personalChoices,
                    imageTypes,
                  })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      <ChoiceFormModal
        choice={choiceForm?.choice ?? null}
        imageTypes={imageTypes}
        onConflict={async () => {
          setChoiceForm(null)
          await resource.refresh()
          setMessage(CONFLICT_MESSAGE)
        }}
        onDismiss={() => setChoiceForm(null)}
        onSaved={(choice) => {
          replaceChoice(choice)
          setChoiceForm(null)
          afterChange()
        }}
        token={token}
        visible={choiceForm !== null}
      />
      <RuleFormModal
        categories={data?.categories ?? []}
        choices={personalChoices}
        imageTypes={imageTypes}
        onConflict={async () => {
          setRuleForm(null)
          await resource.refresh()
          setMessage(CONFLICT_MESSAGE)
        }}
        onDismiss={() => setRuleForm(null)}
        onSaved={(rule) => {
          replaceRule(rule)
          setRuleForm(null)
          afterChange()
        }}
        rule={ruleForm?.rule ?? null}
        token={token}
        visible={ruleForm !== null}
      />
    </SafeAreaView>
  )
}

function ToggleRow({
  disabled,
  hint,
  label,
  last,
  onChange,
  value,
}: {
  disabled?: boolean
  hint: string
  label: string
  last?: boolean
  onChange(value: boolean): void
  value: boolean
}) {
  return (
    <View style={[styles.switchRow, !last && styles.border]}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        accessibilityHint={hint}
        accessibilityLabel={label}
        disabled={disabled}
        ios_backgroundColor="#DDD5C9"
        onValueChange={onChange}
        thumbColor="white"
        trackColor={{ false: '#DDD5C9', true: '#F2A183' }}
        value={value}
      />
    </View>
  )
}

function SectionHeader({
  actionLabel,
  disabled,
  onAction,
  title,
}: {
  actionLabel: string
  disabled?: boolean
  onAction(): void
  title: string
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <AnimatedPressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onAction}
        style={styles.sectionAction}
      >
        <Feather color={colors.link} name="plus" size={16} />
        <Text style={styles.linkText}>{actionLabel}</Text>
      </AnimatedPressable>
    </View>
  )
}

function ItemRow({
  disabled,
  enabled,
  last,
  meta,
  onDelete,
  onEdit,
  onToggle,
  title,
}: {
  disabled?: boolean
  enabled: boolean
  last?: boolean
  meta: (string | null)[]
  onDelete(): void
  onEdit(): void
  onToggle(value: boolean): void
  title: string
}) {
  const details = meta.filter((item): item is string => Boolean(item)).join(' · ')
  return (
    <View style={[styles.itemRow, !last && styles.border]}>
      <View style={[styles.flex, !enabled && styles.dimmed]}>
        <Text numberOfLines={2} style={styles.rowTitle}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.rowHint}>
          {enabled ? details : `Đang tắt · ${details}`}
        </Text>
      </View>
      <Switch
        accessibilityLabel={`Bật ${title}`}
        disabled={disabled}
        ios_backgroundColor="#DDD5C9"
        onValueChange={onToggle}
        thumbColor="white"
        trackColor={{ false: '#DDD5C9', true: '#F2A183' }}
        value={enabled}
      />
      <AnimatedPressable
        accessibilityLabel={`Sửa ${title}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onEdit}
        style={styles.iconButton}
      >
        <Feather color={colors.link} name="edit-2" size={18} />
      </AnimatedPressable>
      <AnimatedPressable
        accessibilityLabel={`Xóa ${title}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onDelete}
        style={styles.iconButton}
      >
        <Feather color="#B3433C" name="trash-2" size={18} />
      </AnimatedPressable>
    </View>
  )
}

function OptionChips({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string
  onSelect(value: string | undefined): void
  options: { value: string; label: string }[]
  selected?: string
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.chipList}>
        <AnimatedPressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === undefined }}
          onPress={() => onSelect(undefined)}
          style={[styles.chip, selected === undefined && styles.chipSelected]}
        >
          <Text style={styles.chipText}>Không chọn</Text>
        </AnimatedPressable>
        {options.map((option) => (
          <AnimatedPressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === option.value }}
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, selected === option.value && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  )
}

function FormModal({
  children,
  error,
  onDismiss,
  onSave,
  saveDisabled,
  saving,
  title,
  visible,
}: {
  children: ReactNode
  error: string | null
  onDismiss(): void
  onSave(): void
  saveDisabled?: boolean
  saving: boolean
  title: string
  visible: boolean
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'fullScreen'}
      visible={visible}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safe}
        >
          <View style={styles.modalHeader}>
            <AnimatedPressable
              accessibilityLabel="Hủy"
              accessibilityRole="button"
              disabled={saving}
              onPress={onDismiss}
              style={styles.headerButton}
            >
              <Text style={styles.cancel}>Hủy</Text>
            </AnimatedPressable>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Lưu"
              accessibilityRole="button"
              disabled={saving || saveDisabled}
              onPress={onSave}
              style={styles.headerButton}
            >
              {saving ? (
                <ActivityIndicator color={colors.link} />
              ) : (
                <Text style={[styles.save, saveDisabled && styles.dimmed]}>Lưu</Text>
              )}
            </AnimatedPressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
            {error ? (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

function ChoiceFormModal({
  choice,
  imageTypes,
  onConflict,
  onDismiss,
  onSaved,
  token,
  visible,
}: {
  choice: DecisionChoice | null
  imageTypes: DecisionChoice[]
  onConflict(): Promise<void>
  onDismiss(): void
  onSaved(choice: DecisionChoice): void
  token: string | null
  visible: boolean
}) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [imageType, setImageType] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setLabel(choice?.label ?? '')
    setDescription(choice?.description ?? '')
    setImageType(choice?.imageType ?? undefined)
    setError(null)
  }, [choice, visible])

  const save = async () => {
    if (!token || saving || !label.trim()) return
    setSaving(true)
    setError(null)
    const input = {
      label: label.trim(),
      description: description.trim() || null,
      imageType: imageType ?? null,
    }
    try {
      onSaved(
        choice
          ? await updateDecisionChoice(token, choice, input)
          : await createDecisionChoice(token, input),
      )
    } catch (reason) {
      if (choice && reason instanceof ApiError && reason.status === 409) await onConflict()
      else if (reason instanceof ApiError && reason.status === 409)
        setError('Đã đạt giới hạn lựa chọn cá nhân. Hãy xóa bớt lựa chọn cũ.')
      else setError(reason instanceof Error ? reason.message : 'Không thể lưu lựa chọn')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      error={error}
      onDismiss={onDismiss}
      onSave={() => void save()}
      saveDisabled={!label.trim()}
      saving={saving}
      title={choice ? 'Sửa lựa chọn' : 'Lựa chọn mới'}
      visible={visible}
    >
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Tên</Text>
        <TextInput
          accessibilityLabel="Tên lựa chọn"
          maxLength={80}
          onChangeText={setLabel}
          placeholder="Ví dụ: Gửi xe – Tòa A"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={label}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Dấu hiệu nhận biết (không bắt buộc)</Text>
        <TextInput
          accessibilityLabel="Dấu hiệu nhận biết"
          maxLength={240}
          multiline
          onChangeText={setDescription}
          placeholder="Ví dụ: vé giấy màu xanh có logo tòa nhà"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.multiline]}
          value={description}
        />
      </View>
      <OptionChips
        label="Loại ảnh"
        onSelect={setImageType}
        options={imageTypeOptions(imageTypes)}
        selected={imageType}
      />
    </FormModal>
  )
}

function RuleFormModal({
  categories,
  choices,
  imageTypes,
  onConflict,
  onDismiss,
  onSaved,
  rule,
  token,
  visible,
}: {
  categories: Category[]
  choices: DecisionChoice[]
  imageTypes: DecisionChoice[]
  onConflict(): Promise<void>
  onDismiss(): void
  onSaved(rule: ExpenseRule): void
  rule: ExpenseRule | null
  token: string | null
  visible: boolean
}) {
  const [form, setForm] = useState<RuleForm>(() => ruleToForm(null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = (patch: Partial<RuleForm>) => setForm((current) => ({ ...current, ...patch }))

  useEffect(() => {
    if (!visible) return
    setForm(ruleToForm(rule))
    setError(null)
  }, [rule, visible])

  const save = async () => {
    if (!token || saving) return
    const input = formToRuleInput(form, rule?.actions.currency ?? 'VND')
    if (!input.ok) {
      setError(input.error)
      return
    }
    setSaving(true)
    setError(null)
    const body = { conditions: input.conditions, actions: input.actions }
    try {
      onSaved(
        rule ? await updateExpenseRule(token, rule, body) : await createExpenseRule(token, body),
      )
    } catch (reason) {
      const conflict = reason instanceof ApiError && reason.status === 409
      if (conflict && rule && /changed|reload/i.test(reason.message)) await onConflict()
      else if (conflict)
        setError('Đã có quy tắc với các điều kiện này, hoặc đã đạt giới hạn số quy tắc.')
      else setError(reason instanceof Error ? reason.message : 'Không thể lưu quy tắc')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      error={error}
      onDismiss={onDismiss}
      onSave={() => void save()}
      saving={saving}
      title={rule ? 'Sửa quy tắc' : 'Quy tắc mới'}
      visible={visible}
    >
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Khi ảnh khớp
      </Text>
      <OptionChips
        label="Lựa chọn cá nhân"
        onSelect={(choiceId) => update({ choiceId })}
        options={choices.map((item) => ({ value: item.id, label: item.label }))}
        selected={form.choiceId}
      />
      <OptionChips
        label="Loại ảnh"
        onSelect={(imageType) => update({ imageType })}
        options={imageTypeOptions(imageTypes)}
        selected={form.imageType}
      />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Cửa hàng trên hóa đơn</Text>
        <TextInput
          accessibilityLabel="Cửa hàng trên hóa đơn"
          autoCapitalize="none"
          maxLength={160}
          onChangeText={(merchantKey) => update({ merchantKey })}
          placeholder="Ví dụ: highlands coffee"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={form.merchantKey}
        />
      </View>
      {form.placeKey ? (
        <Text style={styles.note}>Quy tắc này chỉ áp dụng tại địa điểm đã học.</Text>
      ) : null}
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Thì điền
      </Text>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Số tiền (₫)</Text>
        <TextInput
          accessibilityLabel="Số tiền điền sẵn"
          keyboardType="number-pad"
          maxLength={18}
          onChangeText={(amount) => update({ amount })}
          placeholder="Ví dụ: 5000"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={form.amount}
        />
      </View>
      <OptionChips
        label="Danh mục"
        onSelect={(categoryId) => update({ categoryId })}
        options={categories.map((item) => ({ value: item.id, label: item.name }))}
        selected={form.categoryId}
      />
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Tên cửa hàng</Text>
        <TextInput
          accessibilityLabel="Tên cửa hàng điền sẵn"
          maxLength={160}
          onChangeText={(merchant) => update({ merchant })}
          placeholder="Ví dụ: Highlands Coffee"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={form.merchant}
        />
      </View>
    </FormModal>
  )
}

function imageTypeOptions(imageTypes: DecisionChoice[]) {
  const keys =
    imageTypes.length > 0
      ? imageTypes.map((item) => item.key).filter((key): key is string => Boolean(key))
      : Object.keys(IMAGE_TYPE_LABELS)
  return keys.map((key) => ({ value: key, label: imageTypeLabel(key, imageTypes) }))
}

function confirmDestructive(title: string, message: string, onConfirm: () => Promise<void>) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n${message}`)) void onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => void onConfirm() },
  ])
}

function InlineMessage({ text }: { text: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.message}>
      {text}
    </Text>
  )
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  cancel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 16 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSelected: { backgroundColor: colors.peachSoft },
  chipText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  content: { gap: 14, padding: 16, paddingBottom: 44 },
  dimmed: { opacity: 0.5 },
  empty: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  error: { color: '#B3433C', fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
  field: { gap: 10 },
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
  headerButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 64 },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 40 },
  input: {
    backgroundColor: colors.card,
    borderCurve: 'continuous',
    borderRadius: 14,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 17,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 72,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 10,
  },
  linkButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  linkText: { color: colors.link, fontFamily: fonts.semibold, fontSize: 14 },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  modalContent: { gap: 20, padding: 20, paddingBottom: 44 },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 8,
  },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  note: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  rowHint: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  rowTitle: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  save: { color: colors.link, fontFamily: fonts.semibold, fontSize: 16 },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 78, padding: 16 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
})
