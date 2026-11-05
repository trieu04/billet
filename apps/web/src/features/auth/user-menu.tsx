import { LogOut, Settings, ShieldCheck, BookHeart } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWebSession } from './session'
import { useIsAdmin } from './use-is-admin'

const itemClass =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-sunken'

/** Avatar button that opens the account menu; the admin entry only appears for admins. */
export function UserMenu() {
  const { user, logout } = useWebSession()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = user?.displayName || user?.username || 'Bạn'
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Tài khoản của ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full bg-coral text-sm font-black text-ink ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-coral"
      >
        {name.charAt(0).toUpperCase()}
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-12 z-[70] w-64 rounded-2xl border border-line bg-surface p-2 shadow-float"
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-bold">{name}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
          <nav aria-label="Tài khoản" className="mt-2 grid gap-0.5" onClick={() => setOpen(false)}>
            <Link to="/journal" className={itemClass}>
              <BookHeart className="size-4 text-muted" aria-hidden /> Nhật ký của tôi
            </Link>
            <Link to="/settings" className={itemClass}>
              <Settings className="size-4 text-muted" aria-hidden /> Cài đặt
            </Link>
            {isAdmin ? (
              <Link to="/admin" className={itemClass}>
                <ShieldCheck className="size-4 text-muted" aria-hidden /> Quản trị
              </Link>
            ) : null}
            <button
              type="button"
              className={`${itemClass} text-danger`}
              onClick={() => {
                logout()
                navigate('/', { replace: true })
              }}
            >
              <LogOut className="size-4" aria-hidden /> Đăng xuất
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
