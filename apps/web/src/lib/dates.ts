import { useState } from 'react'

/** Calendar helpers in the browser's local time zone, the zone all expenses are recorded in. */

/** The moment the page was opened; stable across renders so "today" never flickers mid-edit. */
export function useToday(): Date {
  return useState(() => new Date())[0]
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

const pad = (value: number) => String(value).padStart(2, '0')

/** `YYYY-MM` for a local date. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** `YYYY-MM-DD` for a local date. */
export function dayKey(date: Date): string {
  return `${monthKey(date)}-${pad(date.getDate())}`
}

function parseMonth(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number)
  return { year, month }
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonth(key)
  return monthKey(new Date(year, month - 1 + delta, 1))
}

/** Start of the month and of the next month, as ISO instants, for a half-open range. */
export function monthRange(key: string): { from: string; to: string } {
  const { year, month } = parseMonth(key)
  return {
    from: new Date(year, month - 1, 1).toISOString(),
    to: new Date(year, month, 1).toISOString(),
  }
}

export function daysInMonth(key: string): number {
  const { year, month } = parseMonth(key)
  return new Date(year, month, 0).getDate()
}

/** Weekday of the 1st with Monday = 0, matching a Monday-first calendar grid. */
export function firstWeekdayOffset(key: string): number {
  const { year, month } = parseMonth(key)
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

export function formatMonthTitle(key: string): string {
  const { year, month } = parseMonth(key)
  return `Tháng ${month}, ${year}`
}

export function formatDayHeading(key: string, now = new Date()): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const diff = Math.round((startOfDay(now).getTime() - date.getTime()) / 86_400_000)
  const label = date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
  if (diff === 0) return `Hôm nay · ${label}`
  if (diff === 1) return `Hôm qua · ${label}`
  return label
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Value for `<input type="datetime-local">`. */
export function toDateTimeLocal(date: Date): string {
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Turns a `datetime-local` value back into an ISO instant; null when empty or invalid. */
export function fromDateTimeLocal(value: string): string | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}
