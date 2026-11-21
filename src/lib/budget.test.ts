import { describe, expect, it } from 'vitest'
import { METHOD_LIST, allocate } from './budget'

describe('allocate', () => {
  it('splits income 50/30/20', () => {
    const result = allocate({ income: 30000, method: 'fifty_thirty_twenty' })
    expect(result.categoryBased).toBe(false)
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['need', 'want', 'save'])
    expect(result.buckets[0].amount).toBeCloseTo(15000)
    expect(result.buckets[1].amount).toBeCloseTo(9000)
    expect(result.buckets[2].amount).toBeCloseTo(6000)
    expect(result.totalAllocated).toBeCloseTo(30000)
    expect(result.unallocated).toBeCloseTo(0)
  })

  it('splits income 70/20/10', () => {
    const result = allocate({ income: 20000, method: 'seventy_twenty_ten' })
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['spend', 'save', 'donate'])
    expect(result.buckets[0].amount).toBeCloseTo(14000)
    expect(result.buckets[1].amount).toBeCloseTo(4000)
    expect(result.buckets[2].amount).toBeCloseTo(2000)
    expect(result.unallocated).toBeCloseTo(0)
  })

  it('splits income 60/20/20', () => {
    const result = allocate({ income: 25000, method: 'sixty_twenty_twenty' })
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['spend', 'save', 'other'])
    expect(result.buckets[0].amount).toBeCloseTo(15000)
    expect(result.buckets[1].amount).toBeCloseTo(5000)
    expect(result.buckets[2].amount).toBeCloseTo(5000)
  })

  it('saves first, then splits the rest 60/40', () => {
    const result = allocate({ income: 30000, method: 'pay_yourself_first' })
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['save', 'need', 'want'])
    expect(result.buckets[0].amount).toBeCloseTo(6000)
    expect(result.buckets[1].amount).toBeCloseTo(14400)
    expect(result.buckets[2].amount).toBeCloseTo(9600)
    expect(result.totalAllocated).toBeCloseTo(30000)
  })

  it('honours a custom pay-yourself-first percentage', () => {
    const result = allocate({ income: 30000, method: 'pay_yourself_first', pyfSavePercent: 10 })
    expect(result.buckets[0].amount).toBeCloseTo(3000)
    expect(result.buckets[1].amount).toBeCloseTo(16200)
    expect(result.buckets[2].amount).toBeCloseTo(10800)
  })

  it('clamps the savings percentage to 0–100', () => {
    const over = allocate({ income: 30000, method: 'pay_yourself_first', pyfSavePercent: 250 })
    expect(over.buckets[0].amount).toBeCloseTo(30000)
    expect(over.buckets[1].amount).toBeCloseTo(0)
    expect(over.buckets[2].amount).toBeCloseTo(0)

    const under = allocate({ income: 30000, method: 'pay_yourself_first', pyfSavePercent: -5 })
    expect(under.buckets[0].amount).toBeCloseTo(0)
    expect(under.buckets[1].amount).toBeCloseTo(18000)
    expect(under.buckets[2].amount).toBeCloseTo(12000)
  })

  it('derives envelope buckets from category caps', () => {
    const result = allocate({
      income: 30000,
      method: 'envelope',
      categories: [
        { type: 'need', cap: 10000 },
        { type: 'need', cap: 5000 },
        { type: 'want', cap: 5000 },
        { type: 'saving', cap: 3000 }
      ]
    })
    expect(result.categoryBased).toBe(true)
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['need', 'want', 'save'])
    expect(result.buckets[0].amount).toBeCloseTo(15000)
    expect(result.buckets[1].amount).toBeCloseTo(5000)
    expect(result.buckets[2].amount).toBeCloseTo(3000)
    expect(result.totalAllocated).toBeCloseTo(23000)
    expect(result.unallocated).toBeCloseTo(7000)
  })

  it('reports zero-based plans as fully allocated when caps match income', () => {
    const result = allocate({
      income: 30000,
      method: 'zero_based',
      categories: [
        { type: 'need', cap: 15000 },
        { type: 'want', cap: 9000 },
        { type: 'saving', cap: 6000 }
      ]
    })
    expect(result.unallocated).toBeCloseTo(0)
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['need', 'want', 'save'])
  })

  it('reports over-allocation as negative unallocated', () => {
    const result = allocate({
      income: 10000,
      method: 'envelope',
      categories: [{ type: 'need', cap: 12000 }]
    })
    expect(result.totalAllocated).toBeCloseTo(12000)
    expect(result.unallocated).toBeCloseTo(-2000)
  })

  it('ignores missing and negative caps', () => {
    const result = allocate({
      income: 10000,
      method: 'envelope',
      categories: [
        { type: 'need' },
        { type: 'want', cap: -500 }
      ]
    })
    expect(result.totalAllocated).toBeCloseTo(0)
    expect(result.unallocated).toBeCloseTo(10000)
  })

  it('includes donate and other buckets only when capped', () => {
    const result = allocate({
      income: 10000,
      method: 'envelope',
      categories: [
        { type: 'need', cap: 3000 },
        { type: 'donate', cap: 1000 },
        { type: 'other', cap: 500 }
      ]
    })
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['need', 'want', 'save', 'donate', 'other'])
  })

  it('clamps negative income to zero', () => {
    const result = allocate({ income: -5000, method: 'fifty_thirty_twenty' })
    expect(result.income).toBe(0)
    expect(result.totalAllocated).toBe(0)
    expect(result.unallocated).toBe(0)
    expect(result.buckets.every((bucket) => bucket.amount === 0)).toBe(true)
  })

  it('produces percentages that add up to 100 for percentage methods', () => {
    for (const method of METHOD_LIST.filter((entry) => !entry.categoryBased)) {
      const result = allocate({ income: 37500, method: method.id })
      const total = result.buckets.reduce((sum, bucket) => sum + bucket.percent, 0)
      expect(total).toBeCloseTo(100)
    }
  })

  it('exposes exactly the six budget methods', () => {
    expect(METHOD_LIST).toHaveLength(6)
    expect(METHOD_LIST.map((method) => method.id)).toEqual([
      'fifty_thirty_twenty',
      'zero_based',
      'envelope',
      'pay_yourself_first',
      'seventy_twenty_ten',
      'sixty_twenty_twenty'
    ])
  })
})
