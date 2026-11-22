import type { PayFrequency } from '../types'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayISO(): string {
  return isoOf(new Date())
}

export function currentMonth(): string {
  return todayISO().slice(0, 7)
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year ?? 1970, (monthNumber ?? 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year ?? 1970, (monthNumber ?? 1) - 1 + delta, 1)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDayHeading(iso: string): string {
  if (iso === todayISO()) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === isoOf(yesterday)) return 'Yesterday'
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function daysUntil(iso: string): number {
  if (!iso) return Number.NaN
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseISODate(iso).getTime() - today.getTime()) / 86_400_000)
}

export function deadlineLabel(iso: string): string {
  const days = daysUntil(iso)
  if (!Number.isFinite(days)) return 'No deadline'
  if (days < -1) return `Overdue by ${Math.abs(days)} days`
  if (days === -1) return 'Overdue by 1 day'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `${days} days left`
}

export function isMonthAfter(first: string, second: string): boolean {
  return first > second
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return isoOf(date)
}

export function endOfMonth(iso: string): string {
  const date = parseISODate(iso)
  return isoOf(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export interface PayPeriod {
  start: string
  end: string
  label: string
  key: string
}

const PERIOD_LENGTH: Record<'weekly' | 'biweekly', number> = {
  weekly: 7,
  biweekly: 14
}

function periodRangeLabel(startISO: string, endISO: string): string {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startText = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endText = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric'
  })
  return `${startText} – ${endText}, ${end.getFullYear()}`
}

export function payPeriodFor(
  iso: string,
  frequency: PayFrequency,
  anchorISO: string
): PayPeriod {
  if (frequency === 'monthly') {
    const month = monthOf(iso)
    const start = `${month}-01`
    const end = endOfMonth(iso)
    return { start, end, key: start, label: monthLabel(month) }
  }

  if (frequency === 'semimonthly') {
    const month = monthOf(iso)
    if (parseISODate(iso).getDate() <= 15) {
      const start = `${month}-01`
      const end = `${month}-15`
      return { start, end, key: start, label: periodRangeLabel(start, end) }
    }
    const start = `${month}-16`
    const end = endOfMonth(iso)
    return { start, end, key: start, label: periodRangeLabel(start, end) }
  }

  const length = PERIOD_LENGTH[frequency]
  const anchor = anchorISO || iso
  const diff = Math.round(
    (parseISODate(iso).getTime() - parseISODate(anchor).getTime()) / 86_400_000
  )
  const start = addDays(anchor, Math.floor(diff / length) * length)
  const end = addDays(start, length - 1)
  return { start, end, key: start, label: periodRangeLabel(start, end) }
}

export function currentPayPeriod(frequency: PayFrequency, anchorISO: string): PayPeriod {
  return payPeriodFor(todayISO(), frequency, anchorISO)
}

export function shiftPayPeriod(
  period: PayPeriod,
  delta: number,
  frequency: PayFrequency,
  anchorISO: string
): PayPeriod {
  if (frequency === 'monthly') {
    return payPeriodFor(`${shiftMonth(monthOf(period.start), delta)}-01`, frequency, anchorISO)
  }

  if (frequency === 'semimonthly') {
    let cursor = period.start
    const step = delta >= 0 ? 1 : -1
    for (let index = 0; index < Math.abs(delta); index += 1) {
      const month = monthOf(cursor)
      const firstHalf = cursor.endsWith('-01')
      if (step > 0) {
        cursor = firstHalf ? `${month}-16` : `${shiftMonth(month, 1)}-01`
      } else {
        cursor = firstHalf ? `${shiftMonth(month, -1)}-16` : `${month}-01`
      }
    }
    return payPeriodFor(cursor, frequency, anchorISO)
  }

  const length = PERIOD_LENGTH[frequency]
  return payPeriodFor(addDays(period.start, delta * length), frequency, anchorISO)
}
