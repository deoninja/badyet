import { currentMonth, monthLabel, shiftMonth } from '../lib/date'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export function MonthSwitch({
  month,
  onChange
}: {
  month: string
  onChange: (month: string) => void
}) {
  const now = currentMonth()
  return (
    <div className="month-switch">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
      >
        <ChevronLeftIcon />
      </button>
      <div className="month-switch-label">
        <span className="eyebrow">Month</span>
        <strong>{monthLabel(month)}</strong>
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= now}
        aria-label="Next month"
      >
        <ChevronRightIcon />
      </button>
    </div>
  )
}
