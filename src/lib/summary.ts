import type { Category, CategoryType, Expense, Settings } from '../types'
import {
  BUCKET_TYPES,
  TYPE_TO_BUCKET,
  allocate,
  type Allocation,
  type AllocationBucketKey
} from './budget'
import { monthOf } from './date'

export type BucketSpent = Record<AllocationBucketKey, number>
export type TypeSpent = Record<CategoryType, number>

export function emptyBucketSpent(): BucketSpent {
  return { need: 0, want: 0, save: 0, spend: 0, donate: 0, other: 0 }
}

export function emptyTypeSpent(): TypeSpent {
  return { need: 0, want: 0, saving: 0, donate: 0, other: 0 }
}

export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((expense) => monthOf(expense.date) === month)
}

export function sumAmounts(list: { amount: number }[]): number {
  return list.reduce((total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0), 0)
}

export function spentByType(expenses: Expense[], categories: Category[]): TypeSpent {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const totals = emptyTypeSpent()
  for (const expense of expenses) {
    const category = byId.get(expense.categoryId)
    if (!category) continue
    totals[category.type] += Number.isFinite(expense.amount) ? expense.amount : 0
  }
  return totals
}

export function spentByBucket(expenses: Expense[], categories: Category[]): BucketSpent {
  const byType = spentByType(expenses, categories)
  const result = emptyBucketSpent()
  for (const [type, amount] of Object.entries(byType) as [CategoryType, number][]) {
    result[TYPE_TO_BUCKET[type]] += amount
  }
  result.spend = result.need + result.want
  return result
}

export function spentForBucket(bucket: AllocationBucketKey, byType: TypeSpent): number {
  return BUCKET_TYPES[bucket].reduce((total, type) => total + byType[type], 0)
}

export function byCategory(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const expense of expenses) {
    const amount = Number.isFinite(expense.amount) ? expense.amount : 0
    totals[expense.categoryId] = (totals[expense.categoryId] ?? 0) + amount
  }
  return totals
}

export interface BudgetSnapshot {
  income: number
  spent: number
  remaining: number
  allocation: Allocation
  byBucketSpent: BucketSpent
  byTypeSpent: TypeSpent
  byCategorySpent: Record<string, number>
  monthExpenses: Expense[]
}

export function budgetSnapshot(
  settings: Settings,
  categories: Category[],
  expenses: Expense[],
  month: string
): BudgetSnapshot {
  const monthExpenses = expensesInMonth(expenses, month)
  const allocation = allocate({
    income: settings.netIncome,
    method: settings.budgetMethod,
    pyfSavePercent: settings.pyfSavePercent,
    categories: categories.map((category) => ({ type: category.type, cap: category.cap }))
  })
  const byTypeSpent = spentByType(monthExpenses, categories)
  const spent = sumAmounts(monthExpenses)
  return {
    income: settings.netIncome,
    spent,
    remaining: settings.netIncome - spent,
    allocation,
    byBucketSpent: spentByBucket(monthExpenses, categories),
    byTypeSpent,
    byCategorySpent: byCategory(monthExpenses),
    monthExpenses
  }
}

export function totalSaved(goals: { savedAmount: number }[]): number {
  return goals.reduce((total, goal) => total + (Number.isFinite(goal.savedAmount) ? goal.savedAmount : 0), 0)
}
