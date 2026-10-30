import { Navigate, Route, Routes } from 'react-router-dom'
import { HealthPage } from '@/features/health/health-page'
import { JournalPage } from '@/features/journal/journal-page'
import { AuthPage } from '@/features/auth/auth-page'
import { RequireSession } from '@/features/auth/session'
import { LandingPage } from '@/features/marketing/landing-page'
import { PrivacyPage, TermsPage } from '@/features/legal/legal-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route
        path="/journal"
        element={
          <RequireSession>
            <JournalPage />
          </RequireSession>
        }
      />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
