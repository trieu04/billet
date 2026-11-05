import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIsAdmin } from './use-is-admin'

/** Header shortcut to the admin console; renders nothing for everyone else. */
export function AdminLink({ className = '' }: { className?: string }) {
  const isAdmin = useIsAdmin()
  if (!isAdmin) return null
  return (
    <Link
      to="/admin"
      className={`inline-flex h-10 items-center whitespace-nowrap gap-1.5 rounded-full border border-ink/15 bg-surface px-3.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-ink hover:text-white ${className}`}
    >
      <ShieldCheck className="size-4" aria-hidden />
      Quản trị
    </Link>
  )
}
