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
