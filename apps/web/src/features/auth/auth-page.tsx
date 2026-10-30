import { Apple, Chrome, LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { authRequest, type AuthResponse } from './api'
import { passwordLogin, useWebSession } from './session'
import { appleSignIn, googleSignIn } from './social'

type Mode = 'login' | 'register' | 'verify-register' | 'forgot' | 'reset'

export function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const session = useWebSession()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [form, setForm] = useState({
    identifier: '',
    email: '',
    password: '',
    code: '',
  })

  if (session.token) return <Navigate to="/journal" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'register' && !legalAccepted) {
      setError('Bạn cần đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') finish(await passwordLogin(form.identifier, form.password))
      if (mode === 'register') {
        await authRequest('/auth/register/verification/request', {
          method: 'email',
          email: form.email,
        })
        setMode('verify-register')
      }
      if (mode === 'verify-register') {
        const confirmed = await authRequest<{ verificationToken: string }>(
          '/auth/register/verification/confirm',
          { method: 'email', email: form.email, code: form.code },
        )
        finish(
          await authRequest<AuthResponse>('/auth/register', {
            email: form.email,
            password: form.password,
            verificationTokens: [confirmed.verificationToken],
          }),
        )
      }
      if (mode === 'forgot') {
        await authRequest('/auth/password-reset/request', { email: form.email })
        setMode('reset')
      }
      if (mode === 'reset') {
        await authRequest('/auth/password-reset', {
          email: form.email,
          code: form.code,
          newPassword: form.password,
        })
        setMode('login')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể hoàn tất yêu cầu')
    } finally {
      setBusy(false)
    }
  }

  const finish = (response: AuthResponse) => {
    session.authenticate(response)
    navigate('/journal', { replace: true })
  }

  const social = async (provider: 'google' | 'apple') => {
    if (mode === 'register' && !legalAccepted) {
      setError('Bạn cần đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      finish(await (provider === 'google' ? googleSignIn() : appleSignIn()))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập')
    } finally {
      setBusy(false)
    }
  }

  const title = {
    login: 'Chào mừng trở lại',
    register: 'Tạo tài khoản',
    'verify-register': 'Xác nhận email',
    forgot: 'Quên mật khẩu',
    reset: 'Đặt mật khẩu mới',
  }[mode]
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)
  const appleEnabled = Boolean(import.meta.env.VITE_APPLE_OAUTH_CLIENT_ID)
  const socialEnabled = googleEnabled || appleEnabled

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-5 py-10 text-stone-900">
      <section className="w-full max-w-md rounded-[28px] border border-stone-200 bg-[#fffdf9] p-7 shadow-[0_20px_60px_rgba(67,48,33,.10)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#8a4a2e]">Billet</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {mode === 'verify-register' || mode === 'reset'
            ? `Nhập mã 4 số đã gửi tới ${form.email}.`
            : 'Giữ những câu chuyện chi tiêu của bạn ở một nơi an toàn.'}
        </p>

        {mode === 'register' && (
          <label className="mt-6 flex items-start gap-3 rounded-2xl bg-stone-100/80 p-4 text-sm leading-6 text-stone-600">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(event) => setLegalAccepted(event.target.checked)}
              required
              className="mt-1 size-4 accent-[#8a4a2e]"
            />
            <span>
              Tôi từ đủ 16 tuổi và đồng ý với{' '}
              <Link className="font-semibold text-[#8a4a2e] underline" to="/terms" target="_blank">
                Điều khoản sử dụng
              </Link>{' '}
              cùng{' '}
              <Link
                className="font-semibold text-[#8a4a2e] underline"
                to="/privacy"
                target="_blank"
              >
                Chính sách quyền riêng tư
              </Link>
              .
            </span>
          </label>
        )}

        {(mode === 'login' || mode === 'register') && socialEnabled && (
          <div
            className={`mt-7 grid gap-3 ${googleEnabled && appleEnabled ? 'sm:grid-cols-2' : ''}`}
          >
            {googleEnabled && (
              <SocialButton
                icon={Chrome}
                label="Google"
                disabled={busy || (mode === 'register' && !legalAccepted)}
                onClick={() => void social('google')}
              />
            )}
            {appleEnabled && (
              <SocialButton
                icon={Apple}
                label="Apple"
                disabled={busy || (mode === 'register' && !legalAccepted)}
                onClick={() => void social('apple')}
              />
            )}
          </div>
        )}

        {(mode === 'login' || mode === 'register') && socialEnabled && (
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            hoặc
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        )}

        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {mode === 'login' && (
            <Field
              label="Tên đăng nhập hoặc email"
              value={form.identifier}
              onChange={(identifier) => setForm({ ...form, identifier })}
              autoComplete="username"
            />
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              autoComplete="email"
            />
          )}
          {(mode === 'verify-register' || mode === 'reset') && (
            <Field
              label="Mã xác nhận"
              inputMode="numeric"
              value={form.code}
              onChange={(code) => setForm({ ...form, code })}
              autoComplete="one-time-code"
            />
          )}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <Field
              label={mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
              type="password"
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-1 flex h-12 items-center justify-center rounded-full bg-[#f4b89c] font-semibold text-[#3a1d0e] transition hover:bg-[#efa98a] disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : actionLabel(mode)}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
          {mode === 'login' ? (
            <>
              <button
                className="text-stone-500 hover:text-stone-900"
                onClick={() => setMode('forgot')}
              >
                Quên mật khẩu?
              </button>
              <button className="font-medium text-[#8a4a2e]" onClick={() => navigate('/register')}>
                Đăng ký
              </button>
            </>
          ) : (
            <button
              className="text-[#8a4a2e]"
              onClick={() => {
                setError(null)
                navigate('/login')
              }}
            >
              Quay lại đăng nhập
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

function Field({
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string
  onChange(value: string): void
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        required
        className="h-12 rounded-2xl border border-stone-300 bg-white px-4 font-normal outline-none transition focus:border-[#8a4a2e] focus:ring-2 focus:ring-[#f4b89c]/40"
      />
    </label>
  )
}

function SocialButton({
  icon: Icon,
  label,
  ...props
}: { icon: typeof Apple; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white font-medium hover:bg-stone-50 disabled:opacity-60"
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </button>
  )
}

function actionLabel(mode: Mode) {
  return {
    login: 'Đăng nhập',
    register: 'Tiếp tục',
    'verify-register': 'Xác nhận & đăng ký',
    forgot: 'Gửi mã đặt lại',
    reset: 'Đổi mật khẩu',
  }[mode]
}
