const STATUS: Record<string, string> = {
  succeeded: 'Thành công',
  unavailable: 'Không khả dụng',
  disabled: 'Đã tắt',
}

const REASON: Record<string, string> = {
  timeout: 'Quá thời gian chờ',
  deadline: 'Hết thời hạn của client',
  provider_rate_limited: 'Provider giới hạn tần suất',
  provider_error: 'Lỗi provider',
  invalid_output: 'Kết quả không hợp lệ',
  cancelled: 'Client đã hủy',
  provider_disabled: 'Provider đang tắt',
  suggestions_disabled: 'Người dùng tắt gợi ý',
}

const FIELD: Record<string, string> = {
  amountMinor: 'Số tiền',
  occurredAt: 'Thời gian',
  merchant: 'Cửa hàng',
  categoryId: 'Danh mục',
}

const OUTCOME: Record<string, string> = {
  accepted: 'Giữ nguyên',
  edited: 'Đã sửa',
  entered: 'Tự nhập',
  cleared: 'Đã xóa',
  suggested: 'Chỉ gợi ý',
}

const SOURCE: Record<string, string> = {
  user: 'Người dùng',
  ocr: 'OCR',
  personal_rule: 'Rule cá nhân',
  default_rule: 'Rule mặc định',
  decision_model: 'Mô hình',
  capture_time: 'Thời điểm chụp',
}

export const statusLabel = (value: string) => STATUS[value] ?? value
export const reasonLabel = (value: string) => REASON[value] ?? value
export const fieldLabel = (value: string) => FIELD[value] ?? value
export const outcomeLabel = (value: string) => OUTCOME[value] ?? value
export const sourceLabel = (value: string) => SOURCE[value] ?? value
export const STATUS_OPTIONS = Object.keys(STATUS)
export const REASON_OPTIONS = Object.keys(REASON)

export function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN')
}

export function formatCost(microUsd: number): string {
  return (microUsd / 1_000_000).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  })
}

export function formatPercent(part: number, total: number): string {
  if (total === 0) return '–'
  return `${((part / total) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
}

export function formatLatency(ms: number | null): string {
  return ms === null ? '–' : `${formatNumber(Math.round(ms))} ms`
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576)
    return `${(bytes / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} KB`
  return `${(bytes / 1_048_576).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
}
