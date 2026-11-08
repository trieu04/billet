import { Link } from 'react-router-dom'

const CORAL = '#E3705A'

/** Finalized Billet wordmark (docs/brand/logo.md). Ink follows the surrounding text color. */
function Wordmark() {
  return (
    <svg
      aria-hidden="true"
      className="block h-6 w-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth="18"
      viewBox="0 60 422.33 140"
    >
      <path d="M50 109A41 41 0 0 1 91 150A41 41 0 0 1 50 191H9V150A41 41 0 0 1 50 109Z" />
      <path d="M9 60V150" />
      <circle cx="50" cy="150" r="17.6" fill={CORAL} stroke="none" />
      <path d="M132.9 100V200" />
      <rect x="122.46" y="71.66" width="20.88" height="20.88" fill="currentColor" stroke="none" />
      <path d="M174.8 60V200" />
      <path d="M216.7 60V200" />
      <path d="M258.6 150H336.6A39 39 0 1 0 326.92 175.72" />
      <path d="M380.33 72V167A24 24 0 0 0 404.33 191H422.33" />
      <path d="M360.33 109H420.33" />
    </svg>
  )
}

export function Logo({ to = '/', className = '' }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={`inline-block ${className}`} aria-label="Billet, về trang chủ">
      <Wordmark />
    </Link>
  )
}
