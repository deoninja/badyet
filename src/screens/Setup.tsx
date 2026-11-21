import { useState, type FormEvent } from 'react'
import type { BudgetMethod, Settings } from '../types'
import { METHOD_LIST } from '../lib/budget'
import { CURRENCIES, formatMoney } from '../lib/money'
import { useInstallPrompt } from '../hooks/usePwa'
import { DownloadIcon } from '../components/icons'
import { Select } from '../components/Select'
import { ErrorText, ScreenHead, useArmed } from '../components/ui'

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save your settings.'
}

interface SetupProps {
  settings: Settings
  onSave: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>
  onReset: () => Promise<void>
}

export function Setup({ settings, onSave, onReset }: SetupProps) {
  const [income, setIncome] = useState(String(settings.netIncome))
  const [currency, setCurrency] = useState(settings.currency)
  const [method, setMethod] = useState<BudgetMethod>(settings.budgetMethod)
  const [pyf, setPyf] = useState(String(settings.pyfSavePercent))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { armed, trigger } = useArmed(4000)
  const { canInstall, installed, install } = useInstallPrompt()

  const previewIncome = Number.parseFloat(income.replace(',', '.'))
  const preview = Number.isFinite(previewIncome) ? previewIncome : 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!Number.isFinite(previewIncome) || previewIncome <= 0) {
      setError('Enter your monthly take-home pay.')
      return
    }
    const pyfValue = pyf.trim() ? Number.parseFloat(pyf.replace(',', '.')) : 20
    if (!Number.isFinite(pyfValue) || pyfValue < 0 || pyfValue > 100) {
      setError('The pay-yourself-first percentage must be between 0 and 100.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave({
        netIncome: Math.round(previewIncome * 100) / 100,
        currency,
        budgetMethod: method,
        pyfSavePercent: pyfValue
      })
    } catch (saveError) {
      setError(readError(saveError))
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setResetting(true)
    try {
      await onReset()
    } catch (resetError) {
      setError(readError(resetError))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="screen stagger">
      <ScreenHead eyebrow="Setup" title="Set the ground rules" />

      {!settings.setupComplete ? (
        <div className="welcome-banner">
          <span className="eyebrow">Welcome to Badyet</span>
          <p>
            Enter your monthly take-home pay, pick a budget method, and choose your currency. You
            can change all of it later — nothing is locked in.
          </p>
        </div>
      ) : null}

      <form className="card card-pad settings-card" onSubmit={(event) => void submit(event)}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Income & currency</span>
            <h2>The numbers behind the plan</h2>
          </div>
          <span className="today-chip">{formatMoney(preview, currency)} / month</span>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Monthly take-home pay</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={income}
              onChange={(event) => {
                setIncome(event.target.value)
                setError(null)
              }}
              placeholder="30000"
            />
            <span className="xsmall muted">Net pay after tax and deductions. Default is 30,000.</span>
          </label>
          <div className="field">
            <span>Currency</span>
            <Select
              value={currency}
              onChange={setCurrency}
              ariaLabel="Currency"
              options={CURRENCIES.map((option) => ({ value: option.symbol, label: option.label }))}
            />
            <span className="xsmall muted">Display only — amounts stay exactly as entered.</span>
          </div>
        </div>

        <div className="section-head section-head-tight">
          <div>
            <span className="eyebrow">Budget method</span>
            <h2>Pick your operating system</h2>
          </div>
        </div>

        <div className="method-grid" role="group" aria-label="Budget method">
          {METHOD_LIST.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`method-card${method === option.id ? ' is-selected' : ''}`}
              aria-pressed={method === option.id}
              onClick={() => {
                setMethod(option.id)
                setError(null)
              }}
            >
              <span className="method-card-top">
                <span className="method-name">{option.name}</span>
                {option.id === 'fifty_thirty_twenty' ? (
                  <span className="method-default">default</span>
                ) : null}
              </span>
              <span className="method-tagline">{option.tagline}</span>
              <span className="method-best">{option.bestFor}</span>
            </button>
          ))}
        </div>

        <label className={`field pyf-field${method === 'pay_yourself_first' ? ' is-active' : ''}`}>
          <span>Pay-yourself-first percentage</span>
          <div className="pyf-row">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={pyf}
              onChange={(event) => setPyf(event.target.value)}
            />
            <span className="muted small">
              % of income saved before spending. The rest splits 60% needs / 40% wants.
            </span>
          </div>
        </label>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save setup'}
          </button>
          <span className="xsmall muted">Switching methods never deletes expenses or goals.</span>
        </div>
      </form>

      <section className="card card-pad data-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Privacy</span>
            <h2>Your data, your device</h2>
          </div>
        </div>
        <p className="muted small">
          Everything you enter stays on this device. There is no backend, no account, and no sync —
          clearing site data will erase everything.
        </p>

        <div className="data-actions">
          <div className="install-block">
            {canInstall ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void install()}>
                <DownloadIcon width={16} height={16} />
                Install app
              </button>
            ) : (
              <span className="xsmall muted">
                {installed
                  ? 'Installed. Open Badyet from your home screen.'
                  : 'Install: browser menu → Add to Home Screen (iPhone: Share → Add to Home Screen).'}
              </span>
            )}
          </div>
          <button
            type="button"
            className={`btn btn-sm${armed === 'reset' ? ' btn-danger' : ' btn-ghost'}`}
            onClick={() => trigger('reset', () => void reset())}
            disabled={resetting}
          >
            {resetting
              ? 'Resetting…'
              : armed === 'reset'
                ? 'Tap again to erase everything'
                : 'Reset all data'}
          </button>
        </div>
        <p className="xsmall muted data-note">
          Reset removes every expense, goal, and custom category, then restores the default 30,000
          income and starter categories. It cannot be undone.
        </p>
      </section>

      <p className="screen-footnote">
        Developed by <strong>Deo Trinidad</strong>.
      </p>
    </div>
  )
}
