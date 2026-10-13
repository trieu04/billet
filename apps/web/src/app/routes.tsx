import { Navigate, Route, Routes } from 'react-router-dom'
import { HealthPage } from '@/features/health/health-page'
import { JournalPage } from '@/features/journal/journal-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<JournalPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
