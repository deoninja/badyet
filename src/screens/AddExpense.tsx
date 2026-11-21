import { useEffect, useState, type FormEvent } from 'react'
import type { Category } from '../types'
import { TYPE_COLOR, TYPE_LABEL } from '../db/seed'
import { todayISO } from '../lib/date'
import { formatMoney } from '../lib/money'
import { ErrorText, ScreenHead } from '../components/ui'
import { DatePicker } from '../components/DatePicker'
import { PlusIcon } from '../components/icons'

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save the expense.'
}

function yesterdayISO(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

interface AddExpenseProps {
  categories: Category[]
  currency: string
  onAdd: (input: { categoryId: string; amount: number; date: string; note?: string }) => Promise<void>
  onManageCategories: () => void
}

export function AddExpense({
  categories,
  currency,
  onAdd,
  onManageCategories
}: AddExpenseProps) {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!categories.some((category) => category.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  const selected = categories.find((category) => category.id === categoryId)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!selected) {
      setError('Pick a category first.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick a valid date.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onAdd({
        categoryId: selected.id,
        amount: Math.round(parsed * 100) / 100,
        date,
        note: note.trim() ? note.trim() : undefined
      })
    } catch (saveError) {
      setError(readError(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (categories.length === 0) {
    return (
      <div className="screen stagger">
        <ScreenHead eyebrow="Add expense" title="Log a spend" />
        <div className="card card-pad empty">
          <h3>No categories yet</h3>
          <p>Create at least one category before logging an expense.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onManageCategories}>
            Go to Budget
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen stagger">
      <ScreenHead
        eyebrow="Add expense"
        title="Log a spend"
        extra={<span className="today-chip">Saved on this device</span>}
      />

      <form className="card card-pad expense-form" onSubmit={(event) => void submit(event)}>
        <div className="amount-block">
          <label className="amount-label" htmlFor="expense-amount">
            How much?
          </label>
          <div className="amount-field">
            <span className="amount-symbol" aria-hidden="true">
              {currency}
            </span>
            <input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setError(null)
              }}
              autoFocus
            />
          </div>
        </div>

        <fieldset className="category-picker">
          <legend>Category</legend>
          <div className="pick-grid">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`pick-chip${category.id === categoryId ? ' is-selected' : ''}`}
                aria-pressed={category.id === categoryId}
                onClick={() => {
                  setCategoryId(category.id)
                  setError(null)
                }}
              >
                <span
                  className="dot"
                  style={{ background: TYPE_COLOR[category.type] }}
                  aria-hidden="true"
                />
                <span className="pick-chip-text">
                  <strong>{category.name}</strong>
                  <span className="xsmall">{TYPE_LABEL[category.type]}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-row">
          <div className="field">
            <span>Date</span>
            <DatePicker
              value={date}
              onChange={(next) => {
                setDate(next)
                setError(null)
              }}
              ariaLabel="Expense date"
            />
          </div>
          <div className="field quick-dates">
            <span>Quick pick</span>
            <div className="quick-date-row">
              <button
                type="button"
                className={`btn btn-ghost btn-sm${date === todayISO() ? ' is-active' : ''}`}
                onClick={() => setDate(todayISO())}
              >
                Today
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${date === yesterdayISO() ? ' is-active' : ''}`}
                onClick={() => setDate(yesterdayISO())}
              >
                Yesterday
              </button>
            </div>
          </div>
        </div>

        <label className="field">
          <span>
            Note <span className="muted">(optional)</span>
          </span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Lunch with the team"
            maxLength={80}
          />
        </label>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={saving}>
          <PlusIcon width={18} height={18} />
          {saving ? 'Saving…' : `Add ${amount ? formatMoney(Number(amount) || 0, currency) : 'expense'}`}
        </button>
        <p className="xsmall muted form-note">
          Saved straight to this device. The dashboard recalculates immediately.
        </p>
      </form>
    </div>
  )
}
