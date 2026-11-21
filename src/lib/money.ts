export interface CurrencyOption {
  symbol: string
  label: string
}

export const CURRENCIES: CurrencyOption[] = [
  { symbol: '₱', label: 'Philippine peso (₱)' },
  { symbol: '$', label: 'US dollar ($)' },
  { symbol: '€', label: 'Euro (€)' },
  { symbol: '£', label: 'British pound (£)' },
  { symbol: '¥', label: 'Japanese yen (¥)' },
  { symbol: '₹', label: 'Indian rupee (₹)' },
  { symbol: 'A$', label: 'Australian dollar (A$)' }
]

export function formatMoney(amount: number, symbol: string, decimals: number | 'auto' = 'auto'): string {
  const value = Number.isFinite(amount) ? amount : 0
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const digits = decimals === 'auto' ? (Math.abs(absolute - Math.round(absolute)) > 0.004 ? 2 : 0) : decimals
  const body = absolute.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
  return `${sign}${symbol}${body}`
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
