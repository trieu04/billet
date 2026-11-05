import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/features/admin/admin-layout'
import { CatalogPage } from '@/features/admin/catalog-page'
import { LogsPage } from '@/features/admin/logs-page'
import { OverviewPage } from '@/features/admin/overview-page'
import { PlaygroundPage } from '@/features/admin/playground-page'
import { RequireAdmin } from '@/features/admin/require-admin'
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
      <Route
        path="/admin"
        element={
          <RequireSession>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireSession>
        }
      >
        <Route index element={<Navigate to="recognition" replace />} />
        <Route path="recognition" element={<OverviewPage />} />
        <Route path="recognition/logs" element={<LogsPage />} />
        <Route path="recognition/catalog" element={<CatalogPage />} />
        <Route path="recognition/playground" element={<PlaygroundPage />} />
      </Route>
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
