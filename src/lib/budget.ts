import type { BudgetMethod, CategoryType } from '../types'

export type AllocationBucketKey = 'need' | 'want' | 'save' | 'spend' | 'donate' | 'other'

export interface MethodMeta {
  id: BudgetMethod
  name: string
  tagline: string
  bestFor: string
  categoryBased: boolean
}

export const METHOD_LIST: MethodMeta[] = [
  {
    id: 'fifty_thirty_twenty',
    name: '50/30/20',
    tagline: '50% needs · 30% wants · 20% savings',
    bestFor: 'Simple, beginner-friendly budgeting',
    categoryBased: false
  },
  {
    id: 'zero_based',
    name: 'Zero-Based',
    tagline: 'Every peso gets a job. Allocate until income minus plan is zero.',
    bestFor: 'Full control over every category',
    categoryBased: true
  },
  {
    id: 'envelope',
    name: 'Envelope',
    tagline: 'Give each category a cap and never overspend it.',
    bestFor: 'Stopping leaks in food, gas, and fun',
    categoryBased: true
  },
  {
    id: 'pay_yourself_first',
    name: 'Pay Yourself First',
    tagline: 'Save a slice first, then split the rest 60/40.',
    bestFor: 'Consistent savings without willpower',
    categoryBased: false
  },
  {
    id: 'seventy_twenty_ten',
    name: '70/20/10',
    tagline: '70% spend · 20% save · 10% donate',
    bestFor: 'Simple budgeting with giving built in',
    categoryBased: false
  },
  {
    id: 'sixty_twenty_twenty',
    name: '60/20/20',
    tagline: '60% spend · 20% save · 20% other',
    bestFor: 'A balanced, flexible split',
    categoryBased: false
  }
]

export const METHODS: Record<BudgetMethod, MethodMeta> = Object.fromEntries(
  METHOD_LIST.map((method) => [method.id, method])
) as Record<BudgetMethod, MethodMeta>

export const BUCKET_LABELS: Record<AllocationBucketKey, string> = {
  need: 'Needs',
  want: 'Wants',
  save: 'Savings',
  spend: 'Spending',
  donate: 'Donations',
  other: 'Other'
}

export const BUCKET_COLORS: Record<AllocationBucketKey | 'unallocated', string> = {
  need: '#1F6B4A',
  want: '#C2542D',
  save: '#C9971F',
  spend: '#1F6B4A',
  donate: '#7B5170',
  other: '#3F6E72',
  unallocated: '#C9C2B2'
}

export const TYPE_TO_BUCKET: Record<CategoryType, AllocationBucketKey> = {
  need: 'need',
  want: 'want',
  saving: 'save',
  donate: 'donate',
  other: 'other'
}

export const BUCKET_TYPES: Record<AllocationBucketKey, CategoryType[]> = {
  need: ['need'],
  want: ['want'],
  save: ['saving'],
  spend: ['need', 'want'],
  donate: ['donate'],
  other: ['other']
}

export interface AllocationBucket {
  key: AllocationBucketKey
  label: string
  amount: number
  percent: number
  color: string
}

export interface Allocation {
  method: BudgetMethod
  income: number
  categoryBased: boolean
  buckets: AllocationBucket[]
  totalAllocated: number
  unallocated: number
}

export interface AllocateInput {
  income: number
  method: BudgetMethod
  pyfSavePercent?: number
  categories?: { type: CategoryType; cap?: number }[]
}

function finish(
  method: BudgetMethod,
  income: number,
  categoryBased: boolean,
  buckets: AllocationBucket[]
): Allocation {
  const totalAllocated = buckets.reduce((total, bucket) => total + bucket.amount, 0)
  return {
    method,
    income,
    categoryBased,
    buckets,
    totalAllocated,
    unallocated: income - totalAllocated
  }
}

export function allocate(input: AllocateInput): Allocation {
  const income = Math.max(0, Number.isFinite(input.income) ? input.income : 0)

  const makeBucket = (key: AllocationBucketKey, amount: number): AllocationBucket => {
    const safe = Math.max(0, Number.isFinite(amount) ? amount : 0)
    return {
      key,
      label: BUCKET_LABELS[key],
      amount: safe,
      percent: income > 0 ? (safe / income) * 100 : 0,
      color: BUCKET_COLORS[key]
    }
  }

  const fromPercentages = (parts: [AllocationBucketKey, number][]): AllocationBucket[] =>
    parts.map(([key, ratio]) => makeBucket(key, income * ratio))

  switch (input.method) {
    case 'fifty_thirty_twenty':
      return finish(
        input.method,
        income,
        false,
        fromPercentages([
          ['need', 0.5],
          ['want', 0.3],
          ['save', 0.2]
        ])
      )
    case 'seventy_twenty_ten':
      return finish(
        input.method,
        income,
        false,
        fromPercentages([
          ['spend', 0.7],
          ['save', 0.2],
          ['donate', 0.1]
        ])
      )
    case 'sixty_twenty_twenty':
      return finish(
        input.method,
        income,
        false,
        fromPercentages([
          ['spend', 0.6],
          ['save', 0.2],
          ['other', 0.2]
        ])
      )
    case 'pay_yourself_first': {
      const saveRatio = Math.min(100, Math.max(0, input.pyfSavePercent ?? 20)) / 100
      const spendable = income * (1 - saveRatio)
      return finish(input.method, income, false, [
        makeBucket('save', income * saveRatio),
        makeBucket('need', spendable * 0.6),
        makeBucket('want', spendable * 0.4)
      ])
    }
    case 'zero_based':
    case 'envelope': {
      const totals: Record<AllocationBucketKey, number> = {
        need: 0,
        want: 0,
        save: 0,
        spend: 0,
        donate: 0,
        other: 0
      }
      for (const category of input.categories ?? []) {
        const cap = Number.isFinite(category.cap) ? (category.cap ?? 0) : 0
        if (cap <= 0) continue
        totals[TYPE_TO_BUCKET[category.type]] += cap
      }
      const buckets = [
        makeBucket('need', totals.need),
        makeBucket('want', totals.want),
        makeBucket('save', totals.save)
      ]
      if (totals.donate > 0) buckets.push(makeBucket('donate', totals.donate))
      if (totals.other > 0) buckets.push(makeBucket('other', totals.other))
      return finish(input.method, income, true, buckets)
    }
  }
}
