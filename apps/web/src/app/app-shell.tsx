import { BookHeart, ChartColumn, Plus, Settings, Tags } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { buttonClass } from '@/components/button'
import { Logo } from '@/components/logo'
import { AdminLink } from '@/features/auth/admin-link'
import { UserMenu } from '@/features/auth/user-menu'

const navigation = [
  { to: '/journal', label: 'Nhật ký', icon: BookHeart },
  { to: '/stats', label: 'Thống kê', icon: ChartColumn },
  { to: '/categories', label: 'Danh mục', icon: Tags },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
]

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-ink text-white' : 'text-muted hover:bg-sunken hover:text-ink'
  }`

/** Frame for every signed-in page: top bar on wide screens, tab bar on phones. */
export function AppShell() {
  const location = useLocation()
  const composing = location.pathname.startsWith('/journal/')
  return (
    <div className="min-h-screen bg-paper pb-28 md:pb-12">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo to="/journal" />
          <nav aria-label="Chính" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={desktopLink}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AdminLink className="max-sm:hidden" />
            <NavLink to="/journal/new" className={buttonClass('accent', 'md', 'max-md:hidden')}>
              <Plus className="size-4" aria-hidden /> Thêm chi tiêu
            </NavLink>
            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {composing ? null : (
        <nav
          aria-label="Điều hướng nhanh"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
            {navigation.slice(0, 2).map((item) => (
              <TabItem key={item.to} {...item} />
            ))}
            <li className="flex justify-center pb-2">
              <NavLink
                to="/journal/new"
                aria-label="Thêm chi tiêu"
                className="-mt-6 grid size-14 place-items-center rounded-full bg-coral text-ink shadow-float ring-4 ring-surface"
              >
                <Plus className="size-7" aria-hidden />
              </NavLink>
            </li>
            {navigation.slice(2).map((item) => (
              <TabItem key={item.to} {...item} />
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

function TabItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Settings }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold ${
            isActive ? 'text-coral-strong' : 'text-muted'
          }`
        }
      >
        <Icon className="size-5" aria-hidden />
        {label}
      </NavLink>
    </li>
  )
}
