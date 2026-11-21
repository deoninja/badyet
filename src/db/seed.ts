import type { Category, CategoryType, Settings } from '../types'

export function freshSettings(): Settings {
  return {
    id: 'app',
    netIncome: 30000,
    budgetMethod: 'fifty_thirty_twenty',
    currency: '₱',
    pyfSavePercent: 20,
    setupComplete: false
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
