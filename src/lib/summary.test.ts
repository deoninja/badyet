import { describe, expect, it } from 'vitest'
import type { Category, Expense, Settings } from '../types'
import { freshSettings } from '../db/seed'
import { payPeriodFor } from './date'
import {
  budgetSnapshot,
  byCategory,
  expensesInPeriod,
  spentByBucket,
  spentByType,
  spentForBucket,
  totalSaved
} from './summary'

const categories: Category[] = [
  { id: 'food', name: 'Food', type: 'need' },
  { id: 'fun', name: 'Fun', type: 'want' },
  { id: 'invest', name: 'Invest', type: 'saving' }
]

const settings: Settings = { ...freshSettings(), payAmount: 30000, netIncome: 30000 }
const monthly = (iso: string) => payPeriodFor(iso, 'monthly', '2026-11-01')

const expenses: Expense[] = [
  { id: '1', categoryId: 'food', amount: 12000, date: '2026-11-03', createdAt: 1 },
  { id: '2', categoryId: 'fun', amount: 3000, date: '2026-11-10', createdAt: 2 },
  { id: '3', categoryId: 'invest', amount: 5000, date: '2026-10-31', createdAt: 3 }
]

describe('pay period summary', () => {
  it('adds an expense and the dashboard remaining reflects it', () => {
    const before = budgetSnapshot(settings, categories, expenses, monthly('2026-11-15'))
    expect(before.spent).toBe(15000)
    expect(before.remaining).toBe(15000)

    const added: Expense = {
      id: '4',
      categoryId: 'food',
      amount: 500,
      date: '2026-11-20',
      createdAt: 4
    }
    const after = budgetSnapshot(settings, categories, [...expenses, added], monthly('2026-11-15'))

    expect(after.spent).toBe(15500)
    expect(after.remaining).toBe(14500)
    expect(after.byCategorySpent.food).toBe(12500)
    expect(after.periodExpenses).toHaveLength(3)
  })

  it('filters expenses by pay period', () => {
    expect(expensesInPeriod(expenses, monthly('2026-10-15'))).toHaveLength(1)
    expect(expensesInPeriod(expenses, monthly('2026-11-15'))).toHaveLength(2)
    expect(expensesInPeriod(expenses, monthly('2026-12-15'))).toHaveLength(0)
  })

  it('groups spending by bucket and maps savings to save', () => {
    const buckets = spentByBucket(expensesInPeriod(expenses, monthly('2026-10-15')), categories)
    expect(buckets.save).toBe(5000)
    expect(buckets.need).toBe(0)
    expect(buckets.spend).toBe(0)
  })

  it('returns negative remaining when spending exceeds income', () => {
    const big: Expense[] = [
      { id: 'big', categoryId: 'food', amount: 42000, date: '2026-11-05', createdAt: 9 }
    ]
    const snapshot = budgetSnapshot(settings, categories, big, monthly('2026-11-15'))
    expect(snapshot.remaining).toBe(-12000)
  })

  it('maps the 70/20/10 spend bucket to needs plus wants', () => {
    const byType = spentByType(expensesInPeriod(expenses, monthly('2026-11-15')), categories)
    expect(byType.need).toBe(12000)
    expect(byType.want).toBe(3000)
    expect(spentForBucket('spend', byType)).toBe(15000)
    expect(spentForBucket('save', byType)).toBe(0)
  })

  it('builds per-category totals', () => {
    const totals = byCategory(expenses)
    expect(totals.food).toBe(12000)
    expect(totals.fun).toBe(3000)
    expect(totals.invest).toBe(5000)
  })

  it('totals savings across goals', () => {
    expect(
      totalSaved([
        { savedAmount: 1500 },
        { savedAmount: 2500.5 }
      ])
    ).toBe(4000.5)
  })
})
