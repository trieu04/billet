import { useQuery } from '@tanstack/react-query'
import { LockKeyhole } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from '@/components/button'
import { Logo } from '@/components/logo'
import { useWebSession } from '@/features/auth/session'
import { AdminApiError, useAdminRequest } from './api'
import { ErrorState, LoadingState } from './ui'

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-16">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}

/** Renders admin pages only after the server confirms access, so nothing else is requested. */
export function RequireAdmin({ children }: PropsWithChildren) {
  const { token } = useWebSession()
  const request = useAdminRequest()
  const access = useQuery({
    queryKey: ['admin', 'me', token],
    queryFn: () => request<{ isAdmin: true }>('/me'),
    retry: false,
  })

  if (access.isPending)
    return (
      <Centered>
        <LoadingState />
      </Centered>
    )
  if (access.isError) {
    const status = access.error instanceof AdminApiError ? access.error.status : null
    if (status === 403 || status === 401)
      return (
        <Centered>
          <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
            <Logo className="mb-6 inline-block" />
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-coral-soft text-coral-strong">
              <LockKeyhole className="size-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {status === 403 ? 'Không có quyền' : 'Cần đăng nhập lại'}
            </h1>
            <p className="mt-2 text-muted">{access.error.message}</p>
            <Link
              to={status === 403 ? '/journal' : '/login'}
              className={buttonClass('primary', 'lg', 'mt-6')}
            >
              {status === 403 ? 'Về trang nhật ký' : 'Đăng nhập'}
            </Link>
          </div>
        </Centered>
      )
    return (
      <Centered>
        <ErrorState error={access.error} onRetry={() => void access.refetch()} />
      </Centered>
    )
  }
  return children
}
