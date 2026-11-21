import { useEffect, useState, type ReactNode } from 'react'
import { XIcon } from './icons'

export function ProgressBar({
  value,
  max,
  tone,
  over = false,
  label
}: {
  value: number
  max: number
  tone?: string
  over?: boolean
  label?: string
}) {
  const ceiling = Math.max(max, value, 1)
  const percent = Math.min(100, Math.max(0, (value / ceiling) * 100))
  return (
    <div
      className={`progress${over ? ' is-over' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(ceiling)}
      aria-valuenow={Math.round(Math.min(value, ceiling))}
      aria-label={label}
    >
      <span className="progress-fill" style={{ width: `${percent}%`, background: tone }} />
    </div>
  )
}

export function ScreenHead({
  eyebrow,
  title,
  extra
}: {
  eyebrow: string
  title: string
  extra?: ReactNode
}) {
  return (
    <header className="screen-head stagger">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {extra ? <div className="screen-head-extra">{extra}</div> : null}
    </header>
  )
}

export function EmptyState({
  title,
  body,
  action
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        ◇
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function useArmed(timeout = 3200) {
  const [armed, setArmed] = useState<string | null>(null)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(null), timeout)
    return () => window.clearTimeout(timer)
  }, [armed, timeout])

  const trigger = (id: string, action: () => void) => {
    if (armed === id) {
      setArmed(null)
      action()
      return
    }
    setArmed(id)
  }

  return { armed, trigger }
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="error-text" role="alert">
      {children}
    </p>
  )
}
