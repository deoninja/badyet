import type { Category, CategoryType, PayFrequency, Settings } from '../types'
import { todayISO } from '../lib/date'

export const PAY_FREQUENCIES: { value: PayFrequency; label: string; hint: string }[] = [
  { value: 'weekly', label: 'Weekly', hint: 'A paycheck every 7 days' },
  { value: 'biweekly', label: 'Every 2 weeks', hint: 'A paycheck every 14 days' },
  { value: 'semimonthly', label: 'Twice a month', hint: '1st–15th and 16th–end of month' },
  { value: 'monthly', label: 'Monthly', hint: 'One paycheck a month' }
]

const PAY_FREQUENCY_VALUES = new Set<PayFrequency>(
  PAY_FREQUENCIES.map((option) => option.value)
)

export function isPayFrequency(value: unknown): value is PayFrequency {
  return typeof value === 'string' && PAY_FREQUENCY_VALUES.has(value as PayFrequency)
}

export function monthlyEquivalent(payAmount: number, frequency: PayFrequency): number {
  const amount = Number.isFinite(payAmount) ? payAmount : 0
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12
    case 'biweekly':
      return (amount * 26) / 12
    case 'semimonthly':
      return amount * 2
    case 'monthly':
      return amount
  }
}

export function freshSettings(): Settings {
  return {
    id: 'app',
    netIncome: 30000,
    payAmount: 30000,
    payFrequency: 'monthly',
    payAnchor: todayISO(),
    budgetMethod: 'fifty_thirty_twenty',
    currency: '₱',
    pyfSavePercent: 20,
    setupComplete: false
  }
}

export function normalizeSettings(stored: Partial<Settings>): Settings {
  const base = freshSettings()
  const legacyIncome = typeof stored.netIncome === 'number' ? stored.netIncome : undefined
  const payAmount =
    typeof stored.payAmount === 'number' && Number.isFinite(stored.payAmount)
      ? stored.payAmount
      : (legacyIncome ?? base.payAmount)
  const payFrequency = isPayFrequency(stored.payFrequency) ? stored.payFrequency : base.payFrequency
  const payAnchor =
    typeof stored.payAnchor === 'string' && stored.payAnchor ? stored.payAnchor : base.payAnchor

  return {
    ...base,
    ...stored,
    id: 'app',
    netIncome: legacyIncome ?? payAmount,
    payAmount,
    payFrequency,
    payAnchor
  }
}

export const CATEGORY_TYPES: { value: CategoryType; label: string; hint: string }[] = [
  { value: 'need', label: 'Need', hint: 'Rent, food, transport, bills' },
  { value: 'want', label: 'Want', hint: 'Fun, shopping, dining out' },
  { value: 'saving', label: 'Saving', hint: 'Investments, emergency fund' },
  { value: 'donate', label: 'Donation', hint: 'Giving and charity' },
  { value: 'other', label: 'Other', hint: 'Anything outside the plan' }
]

export const TYPE_LABEL: Record<CategoryType, string> = {
  need: 'Need',
  want: 'Want',
  saving: 'Saving',
  donate: 'Donation',
  other: 'Other'
}

export const TYPE_COLOR: Record<CategoryType, string> = {
  need: '#1F6B4A',
  want: '#C2542D',
  saving: '#C9971F',
  donate: '#7B5170',
  other: '#3F6E72'
}

export function defaultCategories(): Category[] {
  return [
    { id: 'cat-food', name: 'Food & groceries', type: 'need' },
    { id: 'cat-transport', name: 'Transport', type: 'need' },
    { id: 'cat-rent', name: 'Rent & bills', type: 'need' },
    { id: 'cat-fun', name: 'Fun & leisure', type: 'want' },
    { id: 'cat-shopping', name: 'Shopping', type: 'want' },
    { id: 'cat-savings', name: 'Savings & invest', type: 'saving' }
  ]
}
