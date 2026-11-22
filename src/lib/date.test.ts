import { describe, expect, it } from 'vitest'
import { payPeriodFor, shiftPayPeriod } from './date'

describe('pay periods', () => {
  it('builds calendar months for monthly pay', () => {
    const period = payPeriodFor('2026-11-20', 'monthly', '2026-01-01')
    expect(period.start).toBe('2026-11-01')
    expect(period.end).toBe('2026-11-30')
    expect(period.label).toBe('November 2026')
  })

  it('builds 7-day periods anchored on a payday', () => {
    const anchor = '2026-11-02'
    expect(payPeriodFor('2026-11-02', 'weekly', anchor)).toMatchObject({
      start: '2026-11-02',
      end: '2026-11-08'
    })
    expect(payPeriodFor('2026-11-10', 'weekly', anchor)).toMatchObject({
      start: '2026-11-09',
      end: '2026-11-15'
    })
  })

  it('builds 14-day periods anchored on a payday', () => {
    const anchor = '2026-11-02'
    expect(payPeriodFor('2026-11-15', 'biweekly', anchor)).toMatchObject({
      start: '2026-11-02',
      end: '2026-11-15'
    })
    expect(payPeriodFor('2026-11-16', 'biweekly', anchor)).toMatchObject({
      start: '2026-11-16',
      end: '2026-11-29'
    })
  })

  it('handles dates before the anchor', () => {
    const period = payPeriodFor('2026-10-20', 'biweekly', '2026-11-02')
    expect(period.start).toBe('2026-10-19')
    expect(period.end).toBe('2026-11-01')
  })

  it('splits semi-monthly pay into 1st–15th and 16th–end', () => {
    expect(payPeriodFor('2026-11-10', 'semimonthly', '2026-11-01')).toMatchObject({
      start: '2026-11-01',
      end: '2026-11-15'
    })
    expect(payPeriodFor('2026-11-20', 'semimonthly', '2026-11-01')).toMatchObject({
      start: '2026-11-16',
      end: '2026-11-30'
    })
  })

  it('shifts periods forward and backward', () => {
    const anchor = '2026-11-02'
    const current = payPeriodFor('2026-11-10', 'weekly', anchor)
    expect(shiftPayPeriod(current, 1, 'weekly', anchor).start).toBe('2026-11-16')
    expect(shiftPayPeriod(current, -1, 'weekly', anchor).start).toBe('2026-11-02')

    const half = payPeriodFor('2026-11-20', 'semimonthly', anchor)
    expect(shiftPayPeriod(half, 1, 'semimonthly', anchor).start).toBe('2026-12-01')
    expect(shiftPayPeriod(half, -1, 'semimonthly', anchor).start).toBe('2026-11-01')

    const month = payPeriodFor('2026-11-20', 'monthly', anchor)
    expect(shiftPayPeriod(month, 1, 'monthly', anchor).start).toBe('2026-12-01')
  })
})
