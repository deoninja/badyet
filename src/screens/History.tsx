import { useMemo, useState } from 'react'
import type { Category, Expense } from '../types'
import { TYPE_COLOR, TYPE_LABEL } from '../db/seed'
import { formatDayHeading } from '../lib/date'
import { formatMoney } from '../lib/money'
import { DatePicker } from '../components/DatePicker'
import { Select } from '../components/Select'
import { CheckIcon, TrashIcon } from '../components/icons'
import { EmptyState, ScreenHead, useArmed } from '../components/ui'

interface HistoryProps {
  expenses: Expense[]
  categories: Category[]
  currency: string
  onDelete: (id: string) => Promise<void>
}

export function History({ expenses, categories, currency, onDelete }: HistoryProps) {
  const [categoryId, setCategoryId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { armed, trigger } = useArmed()

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )

  const filtered = useMemo(() => {
    return expenses
      .filter((expense) => categoryId === 'all' || expense.categoryId === categoryId)
      .filter((expense) => (!from ? true : expense.date >= from))
      .filter((expense) => (!to ? true : expense.date <= to))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [expenses, categoryId, from, to])

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const expense of filtered) {
      const list = map.get(expense.date)
      if (list) list.push(expense)
      else map.set(expense.date, [expense])
    }
    return Array.from(map.entries())
  }, [filtered])

  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0)
  const filtersActive = categoryId !== 'all' || from !== '' || to !== ''
  const badRange = from !== '' && to !== '' && from > to
  const fmt = (value: number) => formatMoney(value, currency)

  return (
    <div className="screen stagger">
      <ScreenHead eyebrow="History" title="Every expense, on the record" />

      <section className="card card-pad filter-card">
        <div className="filter-grid">
          <div className="field">
            <span>Category</span>
            <Select
              value={categoryId}
              onChange={setCategoryId}
              ariaLabel="Filter by category"
              options={[
                { value: 'all', label: 'All categories' },
                ...categories.map((category) => ({ value: category.id, label: category.name }))
              ]}
            />
          </div>
          <div className="field">
            <span>From</span>
            <DatePicker
              value={from}
              onChange={setFrom}
              ariaLabel="From date"
              placeholder="Any date"
              allowClear
            />
          </div>
          <div className="field">
            <span>To</span>
            <DatePicker
              value={to}
              onChange={setTo}
              ariaLabel="To date"
              placeholder="Any date"
              allowClear
            />
          </div>
          <div className="filter-total">
            <span className="xsmall muted">
              {filtered.length} expense{filtered.length === 1 ? '' : 's'}
            </span>
            <strong>{fmt(total)}</strong>
            {filtersActive ? (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setCategoryId('all')
                  setFrom('')
                  setTo('')
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
        {badRange ? <p className="inline-hint is-warn">The start date is after the end date.</p> : null}
      </section>

      {filtered.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title={expenses.length === 0 ? 'No expenses yet' : 'No matches'}
            body={
              expenses.length === 0
                ? 'Once you start logging, every expense shows up here with filters by category and date.'
                : 'Try a different category or widen the date range.'
            }
          />
        </div>
      ) : (
        <div className="history-groups">
          {groups.map(([date, list]) => {
            const dayTotal = list.reduce((sum, expense) => sum + expense.amount, 0)
            return (
              <section className="history-group" key={date}>
                <div className="history-day">
                  <h2>{formatDayHeading(date)}</h2>
                  <span className="muted xsmall">{fmt(dayTotal)}</span>
                </div>
                <ul className="expense-list card">
                  {list.map((expense) => {
                    const category = categoryById.get(expense.categoryId)
                    return (
                      <li className="expense-item has-actions" key={expense.id}>
                        <span
                          className="dot"
                          style={{ background: category ? TYPE_COLOR[category.type] : 'var(--line-strong)' }}
                          aria-hidden="true"
                        />
                        <div className="expense-item-body">
                          <strong>{expense.note?.trim() || category?.name || 'Expense'}</strong>
                          <span className="xsmall muted">
                            {category
                              ? expense.note?.trim()
                                ? `${category.name} · ${TYPE_LABEL[category.type]}`
                                : TYPE_LABEL[category.type]
                              : 'Uncategorized'}
                          </span>
                        </div>
                        <span className="expense-amount">{fmt(expense.amount)}</span>
                        <button
                          type="button"
                          className={`icon-btn icon-btn-sm${armed === expense.id ? ' is-danger' : ''}`}
                          onClick={() =>
                            trigger(expense.id, () => {
                              void onDelete(expense.id)
                            })
                          }
                          aria-label={
                            armed === expense.id ? 'Confirm delete expense' : 'Delete expense'
                          }
                          title={armed === expense.id ? 'Tap again to confirm' : 'Delete expense'}
                        >
                          {armed === expense.id ? (
                            <CheckIcon width={15} height={15} />
                          ) : (
                            <TrashIcon width={15} height={15} />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
