import { ArrowLeft, FlaskConical, Gauge, Library, ScrollText } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { useWebSession } from '@/features/auth/session'

const groups = [
  {
    title: 'Nhận diện chi tiêu',
    items: [
      { to: '/admin/recognition', label: 'Tổng quan', icon: Gauge, end: true },
      { to: '/admin/recognition/logs', label: 'Nhật ký', icon: ScrollText, end: false },
      { to: '/admin/recognition/catalog', label: 'Catalog', icon: Library, end: false },
      { to: '/admin/recognition/playground', label: 'Playground', icon: FlaskConical, end: false },
    ],
  },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-coral)]'
      : 'text-[#cfc3b9] hover:bg-white/8 hover:text-white'
  }`

/**
 * Console frame for the admin area: a sidebar on wide screens that collapses into a top bar with
 * scrolling tabs on phones. It deliberately looks different from the user app.
 */
export function AdminLayout() {
  const { user } = useWebSession()
  return (
    <div className="min-h-screen bg-[#f1ece4] lg:pl-64">
      <aside className="sticky top-0 z-40 bg-ink text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-5">
          <div className="flex items-baseline gap-2">
            <Logo to="/admin" className="text-white" />
            <span className="rounded-md bg-coral px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink">
              Admin
            </span>
          </div>
          <NavLink
            to="/journal"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#cfc3b9] hover:bg-white/10 hover:text-white lg:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden /> Về ứng dụng
          </NavLink>
        </div>
        <nav
          aria-label="Khu vực quản trị"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:py-4"
        >
          {groups.map((group) => (
            <div key={group.title} className="flex gap-1 lg:flex-col">
              <p className="hidden px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a99c92] lg:block">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <NavLink to="/journal" className={linkClass({ isActive: false })}>
            <ArrowLeft className="size-4" aria-hidden /> Về ứng dụng
          </NavLink>
          <p className="mt-2 truncate px-3 text-xs text-[#a99c92]">
            Đăng nhập với {user?.email ?? 'tài khoản quản trị'}
          </p>
        </div>
      </aside>
      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
