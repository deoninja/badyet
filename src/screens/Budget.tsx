import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Category, CategoryType, Expense, Settings } from '../types'
import { METHODS, allocate } from '../lib/budget'
import { CATEGORY_TYPES, TYPE_COLOR, TYPE_LABEL } from '../db/seed'
import { expensesInPeriod, byCategory, spentByType } from '../lib/summary'
import { formatMoney, formatPercent } from '../lib/money'
import { newId } from '../lib/id'
import type { PayPeriod } from '../lib/date'
import { PeriodSwitch } from '../components/PeriodSwitch'
import { Select } from '../components/Select'
import { CheckIcon, PlusIcon, TrashIcon } from '../components/icons'
import { ErrorText, ProgressBar, ScreenHead, useArmed } from '../components/ui'

const GROUP_ORDER: CategoryType[] = ['need', 'want', 'saving', 'donate', 'other']

const GROUP_LABEL: Record<CategoryType, string> = {
  need: 'Needs',
  want: 'Wants',
  saving: 'Savings',
  donate: 'Donations',
  other: 'Other'
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

interface BudgetProps {
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  period: PayPeriod
  onPeriodChange: (start: string) => void
  onSaveCategory: (category: Category) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
  notify: (message: string, tone?: 'default' | 'error') => void
}

export function Budget({
  settings,
  categories,
  expenses,
  period,
  onPeriodChange,
  onSaveCategory,
  onDeleteCategory,
  notify
}: BudgetProps) {
  const fmt = (value: number) => formatMoney(value, settings.currency)
  const periodExpenses = useMemo(() => expensesInPeriod(expenses, period), [expenses, period])
  const spentMap = useMemo(() => byCategory(periodExpenses), [periodExpenses])
  const typeSpent = useMemo(() => spentByType(periodExpenses, categories), [periodExpenses, categories])
  const allocation = useMemo(
    () =>
      allocate({
        income: settings.payAmount,
        method: settings.budgetMethod,
        pyfSavePercent: settings.pyfSavePercent,
        categories: categories.map((category) => ({ type: category.type, cap: category.cap }))
      }),
    [settings, categories]
  )
  const { armed, trigger } = useArmed()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('need')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const usedCategoryIds = useMemo(() => new Set(expenses.map((expense) => expense.categoryId)), [expenses])
  const method = METHODS[settings.budgetMethod]
  const unallocated = allocation.unallocated

  const saveCap = async (category: Category, cap: number | undefined) => {
    try {
      await onSaveCategory({ ...category, cap })
    } catch (error) {
      notify(readError(error), 'error')
    }
  }

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError('Give the category a name.')
      return
    }
    if (categories.some((category) => category.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setFormError('That category already exists.')
      return
    }
    setSaving(true)
    try {
      await onSaveCategory({ id: newId(), name: trimmed, type })
      setName('')
      setType('need')
      setFormError(null)
      setShowForm(false)
      notify('Category added')
    } catch (error) {
      setFormError(readError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen stagger">
      <ScreenHead
        eyebrow="Budget"
        title="Break down the plan"
        extra={
          <PeriodSwitch
            period={period}
            frequency={settings.payFrequency}
            anchor={settings.payAnchor}
            onChange={onPeriodChange}
          />
        }
      />

      <section className="card card-pad alloc-status">
        <div className="alloc-status-main">
          <span className="eyebrow">{method.name} plan</span>
          {method.categoryBased ? (
            unallocated > 0.004 ? (
              <h2>
                <span className="status-num">{fmt(unallocated)}</span> still unallocated
              </h2>
            ) : unallocated < -0.004 ? (
              <h2>
                <span className="status-num is-warn">{fmt(Math.abs(unallocated))}</span> over income
              </h2>
            ) : (
              <h2>Every peso has a job</h2>
            )
          ) : (
            <h2>{method.tagline}</h2>
          )}
          <p className="muted small">
            {method.categoryBased
              ? 'Set a cap per pay period. Caps are summed into the plan and compared with each paycheck.'
              : `${method.bestFor}. Caps below are optional but useful as guardrails.`}
          </p>
        </div>
        <div className="alloc-status-nums">
          <div>
            <span className="xsmall muted">Income</span>
            <strong>{fmt(allocation.income)}</strong>
          </div>
          <div>
            <span className="xsmall muted">{method.categoryBased ? 'Capped' : 'Allocated'}</span>
            <strong>{fmt(allocation.totalAllocated)}</strong>
          </div>
          <div>
            <span className="xsmall muted">Spent</span>
            <strong>{fmt(typeSpent.need + typeSpent.want + typeSpent.saving + typeSpent.donate + typeSpent.other)}</strong>
          </div>
        </div>
      </section>

      {method.categoryBased && allocation.totalAllocated === 0 ? (
        <p className="inline-hint">
          This method is driven by category caps. Add a cap to at least one category below to build
          the plan.
        </p>
      ) : null}

      {GROUP_ORDER.map((groupType) => {
        const list = categories.filter((category) => category.type === groupType)
        if (list.length === 0) return null
        const groupCap = list.reduce((total, category) => total + (category.cap ?? 0), 0)
        return (
          <section className="card card-pad cat-group" key={groupType}>
            <div className="cat-group-head">
              <div className="cat-group-title">
                <span className="dot" style={{ background: TYPE_COLOR[groupType] }} aria-hidden="true" />
                <h2>{GROUP_LABEL[groupType]}</h2>
                <span className="xsmall muted">{list.length}</span>
              </div>
              <div className="cat-group-totals">
                <span className="xsmall muted">{fmt(typeSpent[groupType])} spent</span>
                <span className="xsmall muted">{fmt(groupCap)} planned</span>
              </div>
            </div>
            <ul className="cat-list">
              {list.map((category) => {
                const spent = spentMap[category.id] ?? 0
                const inUse = usedCategoryIds.has(category.id)
                return (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    spent={spent}
                    currency={settings.currency}
                    deleteArmed={armed === category.id}
                    deleteDisabled={inUse}
                    onSaveCap={(cap) => void saveCap(category, cap)}
                    onArmDelete={() =>
                      trigger(category.id, () => {
                        void onDeleteCategory(category.id)
                          .then(() => notify('Category deleted'))
                          .catch((error) => notify(readError(error), 'error'))
                      })
                    }
                  />
                )
              })}
            </ul>
          </section>
        )
      })}

      <section className="card card-pad add-cat-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Categories</span>
            <h2>Make this budget yours</h2>
          </div>
        </div>
        {showForm ? (
          <form className="add-cat-form" onSubmit={(event) => void submitCategory(event)}>
            <div className="form-row">
              <label className="field">
                <span>Name</span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFormError(null)
                  }}
                  placeholder="e.g. Coffee fund"
                  maxLength={40}
                  autoFocus
                />
              </label>
              <div className="field">
                <span>Type</span>
                <Select
                  value={type}
                  onChange={(next) => setType(next as CategoryType)}
                  ariaLabel="Category type"
                  options={CATEGORY_TYPES.map((option) => ({
                    value: option.value,
                    label: option.label
                  }))}
                />
              </div>
            </div>
            {formError ? <ErrorText>{formError}</ErrorText> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Adding…' : 'Add category'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>
            <PlusIcon width={16} height={16} />
            New category
          </button>
        )}
        <p className="xsmall muted add-cat-note">
          Categories with expenses attached can't be deleted. Clear their expenses in History first.
        </p>
      </section>
    </div>
  )
}

function CategoryRow({
  category,
  spent,
  currency,
  deleteArmed,
  deleteDisabled,
  onSaveCap,
  onArmDelete
}: {
  category: Category
  spent: number
  currency: string
  deleteArmed: boolean
  deleteDisabled: boolean
  onSaveCap: (cap: number | undefined) => void
  onArmDelete: () => void
}) {
  const [draft, setDraft] = useState(category.cap != null ? String(category.cap) : '')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraft(category.cap != null ? String(category.cap) : '')
  }, [category.cap])

  const commit = () => {
    const trimmed = draft.trim()
    setInvalid(false)
    if (!trimmed) {
      if (category.cap != null) onSaveCap(undefined)
      return
    }
    const parsed = Number(trimmed.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 0) {
      setInvalid(true)
      return
    }
    if (parsed !== category.cap) onSaveCap(parsed)
  }

  const cap = category.cap
  const over = cap != null && spent > cap
  const capPercent = cap != null && cap > 0 ? (spent / cap) * 100 : 0
  const fmt = (value: number) => formatMoney(value, currency)

  return (
    <li className="cat-row">
      <div className="cat-id">
        <span className="dot" style={{ background: TYPE_COLOR[category.type] }} aria-hidden="true" />
        <div className="cat-id-text">
          <strong>{category.name}</strong>
          <span className="xsmall muted">
            {TYPE_LABEL[category.type]}
            {cap != null ? ` · ${fmt(cap)} cap` : ''}
          </span>
        </div>
      </div>

      <div className="cat-spent">
        <span className="xsmall muted">Spent</span>
        <strong className={over ? 'over-text' : ''}>{fmt(spent)}</strong>
      </div>

      <label className={`cap-field${invalid ? ' is-invalid' : ''}`}>
        <span aria-hidden="true">{currency}</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={draft}
          placeholder="—"
          onChange={(event) => {
            setDraft(event.target.value)
            setInvalid(false)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
          aria-label={`Cap per pay period for ${category.name}`}
        />
      </label>

      <div className="cat-bar">
        {cap != null ? (
          <ProgressBar
            value={spent}
            max={cap}
            tone={over ? 'var(--clay)' : TYPE_COLOR[category.type]}
            over={over}
            label={`${category.name} spending`}
          />
        ) : (
          <div className="progress is-empty" aria-hidden="true" />
        )}
        <div className="cat-bar-meta">
          {invalid ? (
            <span className="xsmall over-text">Enter 0 or more</span>
          ) : cap == null ? (
            <span className="xsmall muted">No cap set</span>
          ) : over ? (
            <span className="xsmall over-text">
              {fmt(spent - cap)} over · {formatPercent(capPercent)}
            </span>
          ) : (
            <span className="xsmall under-text">{fmt(cap - spent)} left</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`icon-btn icon-btn-sm${deleteArmed ? ' is-danger' : ''}`}
        onClick={onArmDelete}
        disabled={deleteDisabled}
        title={deleteDisabled ? 'Move or delete its expenses first' : `Delete ${category.name}`}
        aria-label={`Delete ${category.name}`}
      >
        {deleteArmed ? <CheckIcon width={16} height={16} /> : <TrashIcon width={16} height={16} />}
      </button>
    </li>
  )
}
