import { LogOut } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/button'
import { useToast } from '@/components/toast'
import { Card, ErrorState, Field, inputClass, PageHeader, Skeleton, Switch } from '@/components/ui'
import { useWebSession } from '@/features/auth/session'
import { CURRENCIES } from '@/lib/money'
import { type Profile, type Settings, useProfile, useUpdateProfile } from '@/lib/queries'

export function SettingsPage() {
  const profile = useProfile()
  if (profile.isError)
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Cài đặt"
        title="Tài khoản và tùy chọn"
        description="Điều chỉnh cách Billet ghi nhận và nhắc bạn."
      />
      {profile.isPending ? (
        <div className="space-y-4" aria-busy>
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <ProfileCard profile={profile.data} />
          <PreferencesCard settings={profile.data.settings} />
          <SuggestionsCard settings={profile.data.settings} />
          <SessionCard />
        </>
      )}
    </div>
  )
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  )
}

function ProfileCard({ profile }: { profile: Profile }) {
  const toast = useToast()
  const update = useUpdateProfile()
  const [name, setName] = useState(profile.displayName)
  const dirty = name.trim() !== profile.displayName
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !dirty) return
    update.mutate({ displayName: name.trim() }, { onSuccess: () => toast.show('Đã lưu hồ sơ') })
  }
  return (
    <SettingsCard title="Hồ sơ">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên hiển thị">
          {(props) => (
            <input
              {...props}
              value={name}
              maxLength={100}
              required
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Tên đăng nhập</dt>
            <dd className="font-semibold">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="break-all font-semibold">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Khoản chi đã ghi</dt>
            <dd className="font-semibold tabular-nums">{profile.expenseCount}</dd>
          </div>
        </dl>
        {update.isError ? <ErrorState error={update.error} /> : null}
        <Button type="submit" disabled={!dirty} loading={update.isPending}>
          Lưu hồ sơ
        </Button>
      </form>
    </SettingsCard>
  )
}

/** Applies one setting right away and confirms with a toast. */
function useSettingChange() {
  const toast = useToast()
  const update = useUpdateProfile()
  return {
    update,
    change: (settings: Partial<Settings>) =>
      update.mutate(
        { settings },
        {
          onSuccess: () => toast.show('Đã cập nhật'),
          onError: () => toast.show('Chưa lưu được', 'error'),
        },
      ),
  }
}

function PreferencesCard({ settings }: { settings: Settings }) {
  const { update, change } = useSettingChange()
  return (
    <SettingsCard title="Tùy chọn" description="Thay đổi được lưu ngay.">
      <div className="space-y-5">
        <Field label="Đơn vị tiền mặc định" hint="Dùng cho khoản chi mới, thống kê và ngân sách.">
          {(props) => (
            <select
              {...props}
              value={settings.defaultCurrency}
              disabled={update.isPending}
              onChange={(event) => change({ defaultCurrency: event.target.value })}
              className={`${inputClass} sm:max-w-xs`}
            >
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          )}
        </Field>
        <ToggleRow
          title="Nhắc ghi chi tiêu mỗi ngày"
          description="Một thông báo nhẹ để bạn không bỏ lỡ khoảnh khắc nào."
          checked={settings.reminderEnabled}
          disabled={update.isPending}
          onChange={(reminderEnabled) => change({ reminderEnabled })}
        />
        {settings.reminderEnabled ? (
          <Field label="Giờ nhắc">
            {(props) => (
              <input
                {...props}
                type="time"
                defaultValue={settings.reminderTime ?? '20:00'}
                onBlur={(event) => {
                  const value = event.target.value
                  if (value && value !== settings.reminderTime) change({ reminderTime: value })
                }}
                className={`${inputClass} sm:max-w-40`}
              />
            )}
          </Field>
        ) : null}
        {update.isError ? <ErrorState error={update.error} /> : null}
      </div>
    </SettingsCard>
  )
}

function SuggestionsCard({ settings }: { settings: Settings }) {
  const { update, change } = useSettingChange()
  return (
    <SettingsCard
      title="Gợi ý từ ảnh"
      description="Billet có thể đề xuất loại ảnh và danh mục khi bạn thêm khoản chi trên ứng dụng di động. Bạn luôn là người quyết định."
    >
      <div className="divide-y divide-line/70">
        <ToggleRow
          title="Bật gợi ý"
          description="Ảnh được xử lý để gợi ý và không được lưu lại."
          checked={settings.suggestionsEnabled}
          disabled={update.isPending}
          onChange={(suggestionsEnabled) => change({ suggestionsEnabled })}
        />
        <ToggleRow
          title="Học từ lựa chọn của tôi"
          description="Ghi nhớ thói quen để gợi ý đúng hơn theo thời gian."
          checked={settings.ruleLearningEnabled}
          disabled={update.isPending}
          onChange={(ruleLearningEnabled) => change({ ruleLearningEnabled })}
        />
        <ToggleRow
          title="Dùng vị trí gần đúng"
          description="Chỉ dùng khu vực thô quanh nơi chụp, không lưu tọa độ chính xác."
          checked={settings.suggestionLocationEnabled}
          disabled={update.isPending}
          onChange={(suggestionLocationEnabled) => change({ suggestionLocationEnabled })}
        />
      </div>
    </SettingsCard>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onChange(checked: boolean): void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <Switch label={title} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  )
}

function SessionCard() {
  const { logout } = useWebSession()
  const navigate = useNavigate()
  return (
    <SettingsCard title="Phiên đăng nhập">
      <Button
        variant="secondary"
        onClick={() => {
          logout()
          navigate('/', { replace: true })
        }}
      >
        <LogOut className="size-4" aria-hidden /> Đăng xuất
      </Button>
    </SettingsCard>
  )
}
