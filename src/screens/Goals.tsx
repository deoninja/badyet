import { useMemo, useState, type FormEvent } from 'react'
import type { Goal } from '../types'
import { daysUntil, deadlineLabel } from '../lib/date'
import { formatMoney, formatPercent } from '../lib/money'
import { newId } from '../lib/id'
import { DatePicker } from '../components/DatePicker'
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons'
import {
  EmptyState,
  ErrorText,
  Modal,
  ProgressBar,
  ScreenHead,
  useArmed
} from '../components/ui'

type Dialog =
  | { kind: 'new' }
  | { kind: 'edit'; goal: Goal }
  | { kind: 'contribute'; goal: Goal }
  | null

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save the goal.'
}

function parseAmount(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'))
}

interface GoalsProps {
  goals: Goal[]
  currency: string
  onSave: (goal: Goal) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Goals({ goals, currency, onSave, onDelete }: GoalsProps) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const { armed, trigger } = useArmed()

  const fmt = (value: number) => formatMoney(value, currency)
  const sorted = useMemo(
    () =>
      goals
        .slice()
        .sort((a, b) =>
          (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99')
        ),
    [goals]
  )

  const totalTarget = goals.reduce((total, goal) => total + (goal.targetAmount || 0), 0)
  const totalSavedAmount = goals.reduce((total, goal) => total + (goal.savedAmount || 0), 0)

  return (
    <div className="screen stagger">
      <ScreenHead
        eyebrow="Savings goals"
        title="Give future-you a head start"
        extra={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: 'new' })}>
            <PlusIcon width={16} height={16} />
            New goal
          </button>
        }
      />

      {goals.length > 0 ? (
        <section className="goal-summary card card-pad">
          <div>
            <span className="eyebrow">Across {goals.length} goal{goals.length === 1 ? '' : 's'}</span>
            <h2>{fmt(totalSavedAmount)} saved</h2>
            <p className="muted small">of {fmt(totalTarget)} total target</p>
          </div>
          <div className="goal-summary-bar">
            <ProgressBar
              value={totalSavedAmount}
              max={totalTarget}
              tone="var(--ochre)"
              label="Total savings progress"
            />
            <span className="xsmall muted">
              {formatPercent(totalTarget > 0 ? (totalSavedAmount / totalTarget) * 100 : 0)} complete
            </span>
          </div>
        </section>
      ) : null}

      {sorted.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title="No goals yet"
            body="Emergency fund, a new laptop, a wedding — name it, set a target, and track what you've saved."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: 'new' })}>
                Create your first goal
              </button>
            }
          />
        </div>
      ) : (
        <div className="goal-grid">
          {sorted.map((goal) => {
            const percent =
              goal.targetAmount > 0
                ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
                : 0
            const days = goal.deadline ? daysUntil(goal.deadline) : Number.NaN
            const overdue = Number.isFinite(days) && days < 0
            const soon = Number.isFinite(days) && days >= 0 && days <= 7
            const reached = goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount
            return (
              <article className="goal-card card" key={goal.id}>
                <div className="goal-head">
                  <div className="goal-title">
                    <h3>{goal.name}</h3>
                    <div className="goal-chips">
                      {reached ? (
                        <span className="chip is-good">Goal reached</span>
                      ) : goal.deadline ? (
                        <span className={`chip${overdue ? ' is-warn' : soon ? ' is-soon' : ''}`}>
                          {deadlineLabel(goal.deadline)}
                        </span>
                      ) : (
                        <span className="chip">No deadline</span>
                      )}
                    </div>
                  </div>
                  <span className="goal-pct">{formatPercent(percent)}</span>
                </div>

                <ProgressBar
                  value={goal.savedAmount}
                  max={goal.targetAmount}
                  tone={reached ? 'var(--green)' : 'var(--ochre)'}
                  label={`${goal.name} progress`}
                />

                <div className="goal-meta">
                  <div>
                    <span className="xsmall muted">Saved</span>
                    <strong>{fmt(goal.savedAmount)}</strong>
                  </div>
                  <div>
                    <span className="xsmall muted">Target</span>
                    <strong>{fmt(goal.targetAmount)}</strong>
                  </div>
                  <div>
                    <span className="xsmall muted">Still needed</span>
                    <strong>{fmt(Math.max(0, goal.targetAmount - goal.savedAmount))}</strong>
                  </div>
                </div>

                <div className="goal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDialog({ kind: 'contribute', goal })}
                  >
                    <PlusIcon width={15} height={15} />
                    Add savings
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDialog({ kind: 'edit', goal })}
                    aria-label={`Edit ${goal.name}`}
                  >
                    <PencilIcon width={15} height={15} />
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm${armed === goal.id ? ' is-danger' : ''}`}
                    onClick={() =>
                      trigger(goal.id, () => {
                        void onDelete(goal.id)
                      })
                    }
                    aria-label={armed === goal.id ? `Confirm delete ${goal.name}` : `Delete ${goal.name}`}
                  >
                    {armed === goal.id ? (
                      <CheckIcon width={15} height={15} />
                    ) : (
                      <TrashIcon width={15} height={15} />
                    )}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="screen-footnote">
        Deadlines can be in the past — the app warns you but still tracks the goal. Savings here are
        tracked separately from pay period spending.
      </p>

      <Modal
        open={dialog !== null && dialog.kind !== 'contribute'}
        title={dialog?.kind === 'edit' ? 'Edit goal' : 'New savings goal'}
        onClose={() => setDialog(null)}
      >
        {dialog && dialog.kind !== 'contribute' ? (
          <GoalForm
            initial={dialog.kind === 'edit' ? dialog.goal : undefined}
            currency={currency}
            onSubmit={async (goal) => {
              await onSave(goal)
              setDialog(null)
            }}
            onCancel={() => setDialog(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'contribute'}
        title="Add savings"
        onClose={() => setDialog(null)}
      >
        {dialog?.kind === 'contribute' ? (
          <ContributeForm
            goal={dialog.goal}
            currency={currency}
            onSubmit={async (amount) => {
              await onSave({
                ...dialog.goal,
                savedAmount:
                  Math.round((dialog.goal.savedAmount + amount) * 100) / 100
              })
              setDialog(null)
            }}
            onCancel={() => setDialog(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function GoalForm({
  initial,
  currency,
  onSubmit,
  onCancel
}: {
  initial?: Goal
  currency: string
  onSubmit: (goal: Goal) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.targetAmount) : '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [saved, setSaved] = useState(initial ? String(initial.savedAmount) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const deadlineInPast = deadline ? daysUntil(deadline) < 0 : false

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name your goal.')
      return
    }
    const targetValue = parseAmount(target)
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError('Target amount must be greater than zero.')
      return
    }
    const savedValue = saved.trim() ? parseAmount(saved) : 0
    if (!Number.isFinite(savedValue) || savedValue < 0) {
      setError('Saved amount must be zero or more.')
      return
    }
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setError('Pick a valid deadline or leave it empty.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        id: initial?.id ?? newId(),
        name: trimmed,
        targetAmount: Math.round(targetValue * 100) / 100,
        deadline,
        savedAmount: Math.round(savedValue * 100) / 100
      })
    } catch (saveError) {
      setError(readError(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <label className="field">
        <span>Goal name</span>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          placeholder="e.g. Emergency fund"
          maxLength={50}
          autoFocus
        />
      </label>

      <div className="form-row">
        <label className="field">
          <span>Target amount ({currency})</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
              setError(null)
            }}
            placeholder="50000"
          />
        </label>
        <label className="field">
          <span>Already saved ({currency})</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={saved}
            onChange={(event) => {
              setSaved(event.target.value)
              setError(null)
            }}
            placeholder="0"
          />
        </label>
      </div>

      <div className="field">
        <span>Deadline</span>
        <DatePicker
          value={deadline}
          onChange={(next) => {
            setDeadline(next)
            setError(null)
          }}
          ariaLabel="Goal deadline"
          placeholder="No deadline"
          allowClear
        />
      </div>
      {deadlineInPast ? (
        <p className="inline-hint is-warn">
          That deadline is in the past. You can still save the goal — it will show as overdue.
        </p>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ContributeForm({
  goal,
  currency,
  onSubmit,
  onCancel
}: {
  goal: Goal
  currency: string
  onSubmit: (amount: number) => Promise<void>
  onCancel: () => void
}) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit(Math.round(value * 100) / 100)
    } catch (saveError) {
      setError(readError(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted small">
        {goal.name} · {formatMoney(goal.savedAmount, currency)} of{' '}
        {formatMoney(goal.targetAmount, currency)} saved
      </p>
      <label className="field">
        <span>Amount to add ({currency})</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setError(null)
          }}
          placeholder="1000"
          autoFocus
        />
      </label>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Adding…' : 'Add to savings'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
