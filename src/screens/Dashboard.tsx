import { useMemo } from 'react'
import type { Category, CategoryType, Expense, Goal, Settings } from '../types'
import { METHODS, METHOD_LIST, BUCKET_TYPES } from '../lib/budget'
import { TYPE_LABEL, TYPE_COLOR } from '../db/seed'
import { formatDate, type PayPeriod } from '../lib/date'
import { formatMoney, formatPercent } from '../lib/money'
import { budgetSnapshot, spentForBucket, totalSaved } from '../lib/summary'
import { PeriodSwitch } from '../components/PeriodSwitch'
import { ArrowUpRightIcon } from '../components/icons'
import { EmptyState, ProgressBar, ScreenHead } from '../components/ui'
import { Select } from '../components/Select'

interface DashboardProps {
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  goals: Goal[]
  period: PayPeriod
  onPeriodChange: (start: string) => void
  onNavigate: (route: 'budget' | 'add' | 'history' | 'goals') => void
  onMethodChange: (method: Settings['budgetMethod']) => void
}

export function Dashboard({
  settings,
  categories,
  expenses,
  goals,
  period,
  onPeriodChange,
  onNavigate,
  onMethodChange
}: DashboardProps) {
  const snapshot = useMemo(
    () => budgetSnapshot(settings, categories, expenses, period),
    [settings, categories, expenses, period]
  )

  const fmt = (value: number) => formatMoney(value, settings.currency)
  const method = METHODS[settings.budgetMethod]
  const savedInGoals = totalSaved(goals)
  const spendRatio =
    snapshot.income > 0 ? Math.min(100, Math.max(0, (snapshot.spent / snapshot.income) * 100)) : 0

  const planTypes = new Set(
    snapshot.allocation.buckets.flatMap((bucket) => BUCKET_TYPES[bucket.key])
  )
  const unplannedTypes = (Object.keys(snapshot.byTypeSpent) as CategoryType[]).filter(
    (type) => snapshot.byTypeSpent[type] > 0 && !planTypes.has(type)
  )

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )
  const recent = useMemo(
    () =>
      snapshot.periodExpenses
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [snapshot.periodExpenses]
  )

  const allocationTotal = Math.max(snapshot.allocation.totalAllocated, snapshot.income, 1)
  const overPlanned = snapshot.allocation.unallocated < -0.004

  return (
    <div className="screen stagger">
      <ScreenHead
        eyebrow="Dashboard"
        title="Your pay period at a glance"
        extra={
          <PeriodSwitch
            period={period}
            frequency={settings.payFrequency}
            anchor={settings.payAnchor}
            onChange={onPeriodChange}
          />
        }
      />

      <section className="hero">
        <div className="hero-main">
          <span className="hero-eyebrow">
            {snapshot.remaining < 0 ? 'Over budget' : 'Left to spend'} · {period.label}
          </span>
          <div className={`hero-amount${snapshot.remaining < 0 ? ' is-negative' : ''}`}>
            {fmt(snapshot.remaining)}
          </div>
          <p className="hero-sub">
            {fmt(snapshot.spent)} spent of {fmt(snapshot.income)} income
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-lime" onClick={() => onNavigate('add')}>
              Add expense
            </button>
            <div className="hero-method">
              <span>Method</span>
              <Select
                variant="hero"
                value={settings.budgetMethod}
                onChange={(next) => onMethodChange(next as Settings['budgetMethod'])}
                ariaLabel="Budget method"
                options={METHOD_LIST.map((option) => ({ value: option.id, label: option.name }))}
              />            </div>
          </div>
        </div>

        <div className="hero-side">
          <div
            className="donut"
            style={{
              background: `conic-gradient(var(--clay) ${spendRatio}%, rgba(243, 238, 227, 0.16) 0)`
            }}
          >
            <div className="donut-hole">
              <strong>{formatPercent(spendRatio)}</strong>
              <span>of income spent</span>
            </div>
          </div>
          <div className="hero-mini">
            <div>
              <span>Saved in goals</span>
              <strong>{fmt(savedInGoals)}</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{method.name}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="dash-grid">
        <section className="card card-pad alloc-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Allocation</span>
              <h2>Where the money should go</h2>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate('budget')}>
              Adjust caps
              <ArrowUpRightIcon width={15} height={15} />
            </button>
          </div>

          <div className="alloc-bar" aria-hidden="true">
            {snapshot.allocation.buckets
              .filter((bucket) => bucket.amount > 0)
              .map((bucket) => (
                <span
                  key={bucket.key}
                  className="alloc-seg"
                  title={`${bucket.label}: ${fmt(bucket.amount)}`}
                  style={{
                    flexGrow: bucket.amount / allocationTotal,
                    background: bucket.color
                  }}
                />
              ))}
            {snapshot.allocation.unallocated > 0.004 ? (
              <span
                className="alloc-seg is-unallocated"
                title={`Unallocated: ${fmt(snapshot.allocation.unallocated)}`}
                style={{ flexGrow: snapshot.allocation.unallocated / allocationTotal }}
              />
            ) : null}
          </div>

          <div className="alloc-legend">
            {snapshot.allocation.buckets.map((bucket) => {
              const spent = spentForBucket(bucket.key, snapshot.byTypeSpent)
              const over = bucket.amount > 0 && spent > bucket.amount
              return (
                <div className="alloc-row" key={bucket.key}>
                  <span className="dot" style={{ background: bucket.color }} aria-hidden="true" />
                  <div className={`alloc-row-body${over ? ' is-over' : ''}`}>
                    <div className="alloc-row-top">
                      <strong>{bucket.label}</strong>
                      <span className="muted">
                        {formatPercent(bucket.percent)} · {fmt(bucket.amount)}
                      </span>
                    </div>
                    <ProgressBar
                      value={spent}
                      max={bucket.amount}
                      tone={bucket.color}
                      over={over}
                      label={`${bucket.label} spending`}
                    />
                    <div className="alloc-row-foot">
                      <span className={over ? 'over-text' : 'under-text'}>
                        {over
                          ? `${fmt(spent - bucket.amount)} over`
                          : `${fmt(Math.max(0, bucket.amount - spent))} left`}
                      </span>
                      <span className="muted">{fmt(spent)} spent</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {unplannedTypes.map((type) => (
              <div className="alloc-row is-extra" key={type}>
                <span
                  className="dot"
                  style={{ background: TYPE_COLOR[type] }}
                  aria-hidden="true"
                />
                <div className="alloc-row-body">
                  <div className="alloc-row-top">
                    <strong>Unplanned · {TYPE_LABEL[type]}</strong>
                    <span className="muted">{fmt(snapshot.byTypeSpent[type])}</span>
                  </div>
                  <p className="xsmall muted">
                    Spent in a bucket this method doesn't plan for.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {snapshot.allocation.unallocated > 0.004 ? (
            <p className="alloc-note">
              <strong>{fmt(snapshot.allocation.unallocated)}</strong> is still unallocated.
              {method.categoryBased
                ? ' Set category caps in Budget to give every peso a job.'
                : ' Switch to Envelope or Zero-Based to assign it by category.'}
            </p>
          ) : null}
          {overPlanned ? (
            <p className="alloc-note is-warn">
              Plan is <strong>{fmt(Math.abs(snapshot.allocation.unallocated))}</strong> over income.
              Lower a cap to bring it back in line.
            </p>
          ) : null}
          {method.categoryBased && snapshot.allocation.totalAllocated === 0 ? (
            <div className="callout">
              <p>
                No caps yet. Envelope and Zero-Based plans work by assigning a peso cap to each
                category.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('budget')}>
                Set caps
              </button>
            </div>
          ) : null}
        </section>

        <section className="card card-pad recent-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent expenses</h2>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate('history')}>
              All history
            </button>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="Nothing logged this period"
              body="Add your first expense and the dashboard will update instantly."
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate('add')}>
                  Add expense
                </button>
              }
            />
          ) : (
            <ul className="expense-list">
              {recent.map((expense) => {
                const category = categoryById.get(expense.categoryId)
                return (
                  <li className="expense-item" key={expense.id}>
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
                            ? category.name
                            : TYPE_LABEL[category.type]
                          : 'Uncategorized'}{' '}
                        · {formatDate(expense.date)}
                      </span>
                    </div>
                    <span className="expense-amount">
                      {formatMoney(expense.amount, settings.currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {goals.length > 0 ? (
            <div className="recent-goal">
              <div className="recent-goal-head">
                <span className="eyebrow">Goals</span>
                <button type="button" className="text-link" onClick={() => onNavigate('goals')}>
                  Manage
                </button>
              </div>
              {goals
                .slice()
                .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'))
                .slice(0, 2)
                .map((goal) => {
                  const percent =
                    goal.targetAmount > 0
                      ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
                      : 0
                  return (
                    <div className="mini-goal" key={goal.id}>
                      <div className="mini-goal-top">
                        <span>{goal.name}</span>
                        <span className="muted">{formatPercent(percent)}</span>
                      </div>
                      <ProgressBar
                        value={goal.savedAmount}
                        max={goal.targetAmount}
                        tone="var(--ochre)"
                        label={`${goal.name} progress`}
                      />
                    </div>
                  )
                })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
