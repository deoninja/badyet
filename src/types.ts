export type BudgetMethod =
  | 'fifty_thirty_twenty'
  | 'zero_based'
  | 'envelope'
  | 'pay_yourself_first'
  | 'seventy_twenty_ten'
  | 'sixty_twenty_twenty'

export type CategoryType = 'need' | 'want' | 'saving' | 'donate' | 'other'

export type BucketKey = 'need' | 'want' | 'save' | 'spend' | 'donate' | 'other'

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export interface Settings {
  id: 'app'
  /** Monthly take-home equivalent. Kept for migration and display only. */
  netIncome: number
  /** Take-home pay for a single paycheck. */
  payAmount: number
  payFrequency: PayFrequency
  /** Start date of a known pay period, used to anchor weekly/biweekly periods. */
  payAnchor: string
  budgetMethod: BudgetMethod
  currency: string
  pyfSavePercent: number
  setupComplete: boolean
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  cap?: number
}

export interface Expense {
  id: string
  categoryId: string
  amount: number
  date: string
  note?: string
  createdAt: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  deadline: string
  savedAmount: number
}

export type Route = 'dashboard' | 'budget' | 'add' | 'goals' | 'history' | 'setup'
