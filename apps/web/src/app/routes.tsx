import { Navigate, Route, Routes } from 'react-router-dom'
import { HealthPage } from '@/features/health/health-page'
import { CategoriesPage } from '@/features/categories/categories-page'
import { ExpenseFormPage } from '@/features/journal/expense-form-page'
import { JournalPage } from '@/features/journal/journal-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { StatsPage } from '@/features/stats/stats-page'
import { AppShell } from './app-shell'
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
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/journal/new" element={<ExpenseFormPage />} />
        <Route path="/journal/:id" element={<ExpenseFormPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
