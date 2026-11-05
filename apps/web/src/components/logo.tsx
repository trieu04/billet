import { Link } from 'react-router-dom'

export function Logo({ to = '/', className = '' }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={`text-xl font-black tracking-[-0.04em] ${className}`}
      aria-label="Billet, về trang chủ"
    >
      billet<span className="text-coral">.</span>
    </Link>
  )
}
