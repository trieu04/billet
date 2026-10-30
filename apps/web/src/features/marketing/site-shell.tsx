import { Menu, X } from 'lucide-react'
import { type PropsWithChildren, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Cách hoạt động', href: '/#how-it-works' },
  { label: 'Quyền riêng tư', href: '/privacy' },
]

export function SiteShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f2ea] text-[#251c17]">
      <header className="sticky top-0 z-50 border-b border-[#251c17]/8 bg-[#f7f2ea]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="text-xl font-black tracking-[-0.04em]" aria-label="Billet home">
            billet<span className="text-[#ef764f]">.</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Chính">
            {navigation.map((item) => (
              <NavLink key={item.href} to={item.href} className="transition hover:text-[#bd4d2b]">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-white/60"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[#251c17] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#bd4d2b]"
            >
              Bắt đầu miễn phí
            </Link>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-[#251c17]/10 md:hidden"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
        {menuOpen && (
          <nav className="border-t border-[#251c17]/8 px-5 py-5 md:hidden" aria-label="Di động">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className="rounded-2xl px-4 py-3 font-medium hover:bg-white/60"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Link
                  className="rounded-full border border-[#251c17]/15 px-4 py-3 text-center font-semibold"
                  to="/login"
                >
                  Đăng nhập
                </Link>
                <Link
                  className="rounded-full bg-[#251c17] px-4 py-3 text-center font-semibold text-white"
                  to="/register"
                >
                  Đăng ký
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>
      {children}
      <footer className="border-t border-[#251c17]/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-[#62554c] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Billet. Nhật ký chi tiêu bằng hình ảnh.</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Pháp lý">
            <Link className="hover:text-[#251c17]" to="/terms">
              Điều khoản sử dụng
            </Link>
            <Link className="hover:text-[#251c17]" to="/privacy">
              Chính sách quyền riêng tư
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
