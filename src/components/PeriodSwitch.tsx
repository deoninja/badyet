import type { PayFrequency } from '../types'
import { currentPayPeriod, shiftPayPeriod, type PayPeriod } from '../lib/date'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export function PeriodSwitch({
  period,
  frequency,
  anchor,
  onChange
}: {
  period: PayPeriod
  frequency: PayFrequency
  anchor: string
  onChange: (start: string) => void
}) {
  const now = currentPayPeriod(frequency, anchor)
  return (
    <div className="month-switch">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftPayPeriod(period, -1, frequency, anchor).start)}
        aria-label="Previous pay period"
      >
        <ChevronLeftIcon />
      </button>
      <div className="month-switch-label">
        <span className="eyebrow">Pay period</span>
        <strong>{period.label}</strong>
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftPayPeriod(period, 1, frequency, anchor).start)}
        disabled={period.start >= now.start}
        aria-label="Next pay period"
      >
        <ChevronRightIcon />
      </button>
    </div>
  )
}
