import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { WebSessionProvider } from '@/features/auth/session'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WebSessionProvider>{children}</WebSessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
