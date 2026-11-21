import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'
import { parseISODate, todayISO } from '../lib/date'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const SHORT_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})
const FULL_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
})

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta)
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  allowClear?: boolean
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Select a date',
  allowClear = false
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()))
  const [cursor, setCursor] = useState(todayISO())
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? parseISODate(value) : null
  const today = todayISO()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPopoverStyle(null)
      return
    }
    const trigger = triggerRef.current
    const popover = popoverRef.current
    if (!trigger || !popover) return
    const rect = trigger.getBoundingClientRect()
    const size = popover.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(300, vw - 24)
    const left = Math.min(Math.max(12, rect.left), vw - width - 12)
    const below = rect.bottom + 6
    const top = below + size.height > vh - 12 ? Math.max(12, rect.top - size.height - 6) : below
    setPopoverStyle({ position: 'fixed', top, left, width })
  }, [open])

  useEffect(() => {
    if (!open) return
    popoverRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)
      ?.focus({ preventScroll: true })
  }, [open, cursor, viewDate])

  const openPicker = () => {
    const base = selectedDate ?? new Date()
    setViewDate(startOfMonth(base))
    setCursor(isoOf(base))
    setOpen(true)
  }

  const closePicker = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const choose = (iso: string) => {
    onChange(iso)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const shiftMonth = (delta: number) => {
    const next = addMonths(viewDate, delta)
    setViewDate(next)
    const day = Math.min(parseISODate(cursor).getDate(), daysInMonth(next))
    setCursor(isoOf(new Date(next.getFullYear(), next.getMonth(), day)))
  }

  const moveCursor = (next: Date) => {
    setCursor(isoOf(next))
    setViewDate(startOfMonth(next))
  }

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = parseISODate(cursor)
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveCursor(addDays(current, -1))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveCursor(addDays(current, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveCursor(addDays(current, -7))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveCursor(addDays(current, 7))
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveCursor(addDays(current, -current.getDay()))
    } else if (event.key === 'End') {
      event.preventDefault()
      moveCursor(addDays(current, 6 - current.getDay()))
    } else if (event.key === 'PageUp') {
      event.preventDefault()
      shiftMonth(-1)
    } else if (event.key === 'PageDown') {
      event.preventDefault()
      shiftMonth(1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(cursor)
    }
  }

  const monthStart = startOfMonth(viewDate)
  const gridStart = addDays(monthStart, -monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="date-popover"
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          style={popoverStyle ?? { opacity: 0 }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              closePicker()
            }
          }}
        >
          <div className="date-pop-head">
            <span className="date-pop-title">{MONTH_FORMAT.format(viewDate)}</span>
            <div className="date-nav">
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeftIcon width={16} height={16} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRightIcon width={16} height={16} />
              </button>
            </div>
          </div>
          <div className="date-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-grid" role="group" aria-label={ariaLabel} onKeyDown={onGridKeyDown}>
            {days.map((day) => {
              const iso = isoOf(day)
              const isSelected = iso === value
              const isToday = iso === today
              const isOutside = day.getMonth() !== viewDate.getMonth()
              const classes = [
                'date-day',
                isOutside ? 'is-outside' : '',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : ''
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  className={classes}
                  aria-label={FULL_FORMAT.format(day)}
                  aria-current={isSelected ? 'date' : undefined}
                  tabIndex={iso === cursor ? 0 : -1}
                  onClick={() => choose(iso)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
          <div className="date-pop-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose(today)}>
              Today
            </button>
            {allowClear ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!value}
                onClick={() => {
                  onChange('')
                  closePicker()
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className={`datepicker${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`date-trigger${selectedDate ? '' : ' has-placeholder'}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            openPicker()
          }
        }}
      >
        <span className="date-trigger-main">
          <CalendarIcon className="date-trigger-icon" width={16} height={16} />
          <span className="date-value">
            {selectedDate ? SHORT_FORMAT.format(selectedDate) : placeholder}
          </span>
        </span>
        <ChevronDownIcon className="date-caret" width={16} height={16} />
      </button>
      {popover}
    </div>
  )
}
